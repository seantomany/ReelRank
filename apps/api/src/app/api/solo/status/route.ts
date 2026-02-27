import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { handleApiError } from '@/lib/errors';
import type { MovieUserStatus } from '@reelrank/shared';

export const GET = withAuth(async (req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const movieId = parseInt(searchParams.get('movieId') ?? '0', 10);
    if (!movieId) {
      return NextResponse.json({ error: 'movieId required', requestId }, { status: 400 });
    }

    const [swipeSnap, watchedSnap] = await Promise.all([
      getDb().collection(COLLECTIONS.soloSwipes).doc(`${user.id}_${movieId}`).get(),
      getDb().collection(COLLECTIONS.watchedMovies).doc(`${user.id}_${movieId}`).get(),
    ]);

    const status: MovieUserStatus = {};

    if (swipeSnap.exists) {
      status.swipeDirection = (swipeSnap.data() as { direction: 'left' | 'right' }).direction;
    }

    if (watchedSnap.exists) {
      const wd = watchedSnap.data()!;
      status.watched = {
        id: watchedSnap.id,
        userId: wd.userId,
        movieId: wd.movieId,
        rating: wd.rating,
        watchedAt: wd.watchedAt,
        venue: wd.venue,
        notes: wd.notes,
        createdAt: wd.createdAt,
        updatedAt: wd.updatedAt,
      };
    }

    return NextResponse.json({ data: status, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
