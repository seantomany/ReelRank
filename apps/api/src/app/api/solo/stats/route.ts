import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';

export const GET = withAuth(async (_req, { user, requestId }) => {
  const [rightSnap, leftSnap, pairwiseSnap, watchedSnap, rankedListDoc] = await Promise.all([
    getDb().collection(COLLECTIONS.soloSwipes)
      .where('userId', '==', user.id)
      .where('direction', '==', 'right')
      .count().get(),
    getDb().collection(COLLECTIONS.soloSwipes)
      .where('userId', '==', user.id)
      .where('direction', '==', 'left')
      .count().get(),
    getDb().collection(COLLECTIONS.pairwiseChoices)
      .where('userId', '==', user.id)
      .count().get(),
    getDb().collection(COLLECTIONS.watchedMovies)
      .where('userId', '==', user.id)
      .count().get(),
    getDb().collection(COLLECTIONS.rankedLists).doc(user.id).get(),
  ]);

  const rightSwipes = rightSnap.data().count;
  const leftSwipes = leftSnap.data().count;
  const totalSwipes = rightSwipes + leftSwipes;
  const uniqueRanked = rankedListDoc.exists
    ? (rankedListDoc.data()?.movieIds?.length ?? 0)
    : 0;

  return NextResponse.json({
    data: {
      totalSwipes,
      rightSwipes,
      leftSwipes,
      pairwiseChoices: pairwiseSnap.data().count,
      moviesWatched: watchedSnap.data().count,
      winRate: totalSwipes > 0 ? Math.round((rightSwipes / totalSwipes) * 100) : 0,
      uniqueRanked,
    },
    requestId,
  });
});
