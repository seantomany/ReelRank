import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { safeGetMovieById } from '@/lib/tmdb';
import { ListTypeSchema } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';

export const GET = withAuth(async (req: NextRequest, { user, requestId }) => {
  const url = new URL(req.url);
  const typeParam = url.searchParams.get('type');
  const parsed = ListTypeSchema.safeParse(typeParam);

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid list type. Must be "want" or "pass"', requestId);
  }

  const listType = parsed.data;
  const direction = listType === 'want' ? 'right' : 'left';

  const snapshot = await getDb()
    .collection(COLLECTIONS.soloSwipes)
    .where('userId', '==', user.id)
    .where('direction', '==', direction)
    .orderBy('createdAt', 'desc')
    .get();

  const warnings: string[] = [];
  const movies = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const { movie, hydrated } = await safeGetMovieById(data.movieId);
      if (!hydrated) {
        warnings.push(`Movie ${data.movieId} could not be loaded`);
      }
      return {
        ...data,
        movie,
        createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
      };
    })
  );

  return NextResponse.json({
    data: movies,
    ...(warnings.length > 0 ? { warnings } : {}),
    requestId,
  });
});
