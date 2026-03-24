import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { WatchedMovieInputSchema } from '@reelrank/shared';
import { safeGetMovieById } from '@/lib/tmdb';
import { ApiError } from '@/lib/errors';
import { FieldValue } from 'firebase-admin/firestore';

export const POST = withAuthAndRateLimit('general', async (req, { user, requestId }) => {
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = WatchedMovieInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { movieId, rating, watchedAt, venue, notes } = parsed.data;
  const docId = `${user.id}_${movieId}`;
  const now = new Date();

  await getDb().collection(COLLECTIONS.watchedMovies).doc(docId).set({
    id: docId,
    userId: user.id,
    movieId,
    rating,
    watchedAt,
    venue,
    notes: notes ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const swipeDocId = `${user.id}_${movieId}`;
  await getDb().collection(COLLECTIONS.soloSwipes).doc(swipeDocId).set({
    id: swipeDocId,
    userId: user.id,
    movieId,
    direction: 'right',
    createdAt: now,
  }, { merge: true });

  const rankedListRef = getDb().collection(COLLECTIONS.rankedLists).doc(user.id);
  const rankedDoc = await rankedListRef.get();
  if (rankedDoc.exists) {
    const movieIds: number[] = rankedDoc.data()?.movieIds ?? [];
    if (!movieIds.includes(movieId)) {
      await rankedListRef.update({
        movieIds: FieldValue.arrayUnion(movieId),
        updatedAt: now,
      });
    }
  } else {
    await rankedListRef.set({
      userId: user.id,
      movieIds: [movieId],
      updatedAt: now,
    });
  }

  return NextResponse.json({ data: { id: docId, movieId, rating }, requestId });
});

export const GET = withAuth(async (_req: NextRequest, { user, requestId }) => {
  const snapshot = await getDb()
    .collection(COLLECTIONS.watchedMovies)
    .where('userId', '==', user.id)
    .get();

  const warnings: string[] = [];
  const movies = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const { movie, hydrated } = await safeGetMovieById(data.movieId);
      if (!hydrated) {
        warnings.push(`Movie ${data.movieId} could not be loaded`);
      }
      const createdAt = data.createdAt?.toDate?.() ?? new Date(data.createdAt ?? 0);
      return {
        ...data,
        movie,
        createdAt: createdAt.toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
        _ts: createdAt.getTime(),
      };
    })
  );

  movies.sort((a, b) => b._ts - a._ts);
  const result = movies.map(({ _ts, ...rest }) => rest);

  return NextResponse.json({
    data: result,
    ...(warnings.length > 0 ? { warnings } : {}),
    requestId,
  });
});
