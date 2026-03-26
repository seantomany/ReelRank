import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { ApiError } from '@/lib/errors';
import { safeGetMovieById } from '@/lib/tmdb';

export const GET = withAuth(async (_req: NextRequest, { user, requestId, params }) => {
  const targetUserId = params?.userId;
  if (!targetUserId) {
    throw new ApiError(400, 'userId is required', requestId);
  }

  const friendships = await getDb()
    .collection(COLLECTIONS.friendships)
    .where('userIds', 'array-contains', user.id)
    .get();
  const isFriend = friendships.docs.some((d) =>
    (d.data().userIds as string[]).includes(targetUserId)
  );
  if (!isFriend && targetUserId !== user.id) {
    throw new ApiError(403, 'You can only view profiles of friends', requestId);
  }

  const targetDoc = await getDb().collection(COLLECTIONS.users).doc(targetUserId).get();
  const targetData = targetDoc.data();
  if (!targetData) {
    throw new ApiError(404, 'User not found', requestId);
  }

  const [swipesSnap, watchedSnap] = await Promise.all([
    getDb().collection(COLLECTIONS.soloSwipes)
      .where('userId', '==', targetUserId)
      .get(),
    getDb().collection(COLLECTIONS.watchedMovies)
      .where('userId', '==', targetUserId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get(),
  ]);

  const totalSwipes = swipesSnap.size;
  const rightSwipes = swipesSnap.docs.filter((d) => d.data().direction === 'right').length;

  const recentWatched = [];
  for (const doc of watchedSnap.docs) {
    const d = doc.data();
    const { movie } = await safeGetMovieById(d.movieId);
    recentWatched.push({
      movieId: d.movieId,
      movie,
      rating: d.rating,
      watchedAt: d.watchedAt,
      venue: d.venue,
      notes: d.notes ?? null,
      id: doc.id,
    });
  }

  return NextResponse.json({
    data: {
      userId: targetUserId,
      displayName: targetData.displayName ?? targetData.username ?? targetData.email?.split('@')[0],
      photoUrl: targetData.photoUrl ?? null,
      stats: {
        totalSwipes,
        likeRate: totalSwipes > 0 ? Math.round((rightSwipes / totalSwipes) * 100) : 0,
        moviesWatched: watchedSnap.size,
      },
      recentWatched,
    },
    requestId,
  });
});
