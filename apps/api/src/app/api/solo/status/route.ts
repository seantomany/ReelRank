import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { ApiError } from '@/lib/errors';
import type { MovieUserStatus } from '@reelrank/shared';

export const GET = withAuth(async (req: NextRequest, { user, requestId }) => {
  const url = new URL(req.url);
  const movieIdParam = url.searchParams.get('movieId');

  if (!movieIdParam || isNaN(parseInt(movieIdParam, 10))) {
    throw new ApiError(400, 'Missing or invalid movieId parameter', requestId);
  }

  const movieId = parseInt(movieIdParam, 10);
  const swipeDocId = `${user.id}_${movieId}`;
  const watchedDocId = `${user.id}_${movieId}`;

  const [swipeDoc, watchedDoc] = await Promise.all([
    getDb().collection(COLLECTIONS.soloSwipes).doc(swipeDocId).get(),
    getDb().collection(COLLECTIONS.watchedMovies).doc(watchedDocId).get(),
  ]);

  const status: MovieUserStatus = {};

  if (swipeDoc.exists) {
    status.swipeDirection = swipeDoc.data()!.direction;
  }

  if (watchedDoc.exists) {
    const data = watchedDoc.data()!;
    status.watched = {
      id: watchedDoc.id,
      userId: data.userId,
      movieId: data.movieId,
      rating: data.rating,
      watchedAt: data.watchedAt,
      venue: data.venue,
      notes: data.notes,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
    };
  }

  return NextResponse.json({ data: status, requestId });
});
