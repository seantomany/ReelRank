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

  try {
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
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Failed to check friendship:', error);
  }

  const targetDoc = await getDb().collection(COLLECTIONS.users).doc(targetUserId).get();
  const targetData = targetDoc.data();
  if (!targetData) {
    throw new ApiError(404, 'User not found', requestId);
  }

  let totalSwipes = 0;
  let rightSwipes = 0;
  let moviesWatched = 0;
  const recentWatched: any[] = [];
  const topRanked: any[] = [];

  try {
    const swipesSnap = await getDb().collection(COLLECTIONS.soloSwipes)
      .where('userId', '==', targetUserId)
      .get();
    totalSwipes = swipesSnap.size;
    rightSwipes = swipesSnap.docs.filter((d) => d.data().direction === 'right').length;
  } catch {
    // ignore index errors
  }

  try {
    const watchedSnap = await getDb().collection(COLLECTIONS.watchedMovies)
      .where('userId', '==', targetUserId)
      .limit(10)
      .get();
    moviesWatched = watchedSnap.size;

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
  } catch {
    // ignore index errors
  }

  try {
    const listDoc = await getDb().collection(COLLECTIONS.rankedLists).doc(targetUserId).get();
    if (listDoc.exists) {
      const movieIds: number[] = (listDoc.data()!.movieIds ?? []).slice(0, 10);
      const movieResults = await Promise.all(movieIds.map((id) => safeGetMovieById(id)));
      for (let i = 0; i < movieResults.length; i++) {
        topRanked.push({
          movieId: movieIds[i],
          movie: movieResults[i].movie,
          rank: i + 1,
        });
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    data: {
      userId: targetUserId,
      displayName: targetData.displayName ?? targetData.username ?? targetData.email?.split('@')[0],
      photoUrl: targetData.photoUrl ?? null,
      stats: {
        totalSwipes,
        likeRate: totalSwipes > 0 ? Math.round((rightSwipes / totalSwipes) * 100) : 0,
        moviesWatched,
      },
      recentWatched,
      topRanked,
    },
    requestId,
  });
});
