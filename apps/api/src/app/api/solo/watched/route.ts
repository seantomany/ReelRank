import { NextRequest, NextResponse } from 'next/server';
import { WatchedMovieInputSchema } from '@reelrank/shared';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { getMovieById } from '@/lib/tmdb';
import { handleApiError } from '@/lib/errors';

export const POST = withAuth(async (req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const parsed = WatchedMovieInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

    const docId = `${user.id}_${parsed.data.movieId}`;
    const ref = getDb().collection(COLLECTIONS.watchedMovies).doc(docId);
    const now = new Date().toISOString();

    const data = {
      userId: user.id,
      movieId: parsed.data.movieId,
      rating: parsed.data.rating,
      watchedAt: parsed.data.watchedAt,
      venue: parsed.data.venue,
      notes: parsed.data.notes ?? '',
      createdAt: now,
      updatedAt: now,
    };

    const existing = await ref.get();
    if (existing.exists) {
      const { createdAt: _, ...update } = data;
      await ref.update({ ...update, updatedAt: now });
    } else {
      await ref.set(data);
    }

    return NextResponse.json({ data: { id: docId, ...data }, requestId }, { status: existing.exists ? 200 : 201 });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});

export const GET = withAuth(async (req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const snapshot = await getDb()
      .collection(COLLECTIONS.watchedMovies)
      .where('userId', '==', user.id)
      .orderBy('watchedAt', 'desc')
      .get();

    const entries = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

    const movies = await Promise.all(
      entries.map((e) => getMovieById(e.movieId as number).catch(() => null)),
    );

    const results = entries
      .map((entry, i) => ({ ...entry, movie: movies[i] }))
      .filter((r) => r.movie);

    return NextResponse.json({ data: results, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
