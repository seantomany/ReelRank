import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { handleApiError } from '@/lib/errors';

export const GET = withAuth(async (_req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const [swipesSnap, watchedSnap, pairwiseSnap] = await Promise.all([
      getDb().collection(COLLECTIONS.soloSwipes)
        .where('userId', '==', user.id)
        .get(),
      getDb().collection(COLLECTIONS.watchedMovies)
        .where('userId', '==', user.id)
        .get(),
      getDb().collection(COLLECTIONS.pairwiseChoices)
        .where('userId', '==', user.id)
        .get(),
    ]);

    const swipes = swipesSnap.docs.map((d) => d.data() as { direction: string });
    const rightSwipes = swipes.filter((s) => s.direction === 'right').length;
    const totalSwipes = swipes.length;

    const watched = watchedSnap.docs.map((d) => d.data() as { rating: number; venue: string });
    const totalWatched = watched.length;
    const avgRating = totalWatched > 0
      ? watched.reduce((sum, w) => sum + w.rating, 0) / totalWatched
      : 0;

    const venueCounts = new Map<string, number>();
    for (const w of watched) {
      venueCounts.set(w.venue, (venueCounts.get(w.venue) ?? 0) + 1);
    }
    const topVenues = Array.from(venueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([venue, count]) => ({ venue, count }));

    const stats = {
      totalSwipes,
      rightSwipes,
      leftSwipes: totalSwipes - rightSwipes,
      matchRate: totalSwipes > 0 ? rightSwipes / totalSwipes : 0,
      totalWatched,
      avgRating: Math.round(avgRating * 10) / 10,
      totalPairwise: pairwiseSnap.size,
      topVenues,
    };

    return NextResponse.json({ data: stats, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
