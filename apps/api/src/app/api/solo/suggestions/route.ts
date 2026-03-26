import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { getRecommendations } from '@/lib/tmdb';
import type { Movie } from '@reelrank/shared';

export const GET = withAuth(async (_req, { user, requestId }) => {
  try {
    const watchedSnap = await getDb()
      .collection(COLLECTIONS.watchedMovies)
      .where('userId', '==', user.id)
      .limit(20)
      .get();

    if (watchedSnap.empty) {
      return NextResponse.json({ data: [], requestId });
    }

    const watchedDocs = watchedSnap.docs
      .map((d) => ({ movieId: d.data().movieId as number, rating: (d.data().rating as number) ?? 0 }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    const swipedSnap = await getDb()
      .collection(COLLECTIONS.soloSwipes)
      .where('userId', '==', user.id)
      .select('movieId')
      .get();
    const seenIds = new Set<number>(swipedSnap.docs.map((d) => d.data().movieId as number));
    for (const d of watchedSnap.docs) seenIds.add(d.data().movieId as number);

    const seedIds = watchedDocs.map((d) => d.movieId);

    const allRecs: Movie[] = [];
    const addedIds = new Set<number>();

    await Promise.all(
      seedIds.map(async (movieId) => {
        try {
          const { movies } = await getRecommendations(movieId);
          for (const m of movies) {
            if (!seenIds.has(m.id) && !addedIds.has(m.id)) {
              addedIds.add(m.id);
              allRecs.push(m);
            }
          }
        } catch {
          // skip failed recommendations
        }
      })
    );

    allRecs.sort((a, b) => b.popularity - a.popularity);

    return NextResponse.json({ data: allRecs.slice(0, 20), requestId });
  } catch (error) {
    console.error('Failed to fetch suggestions:', error);
    return NextResponse.json({ data: [], requestId });
  }
});
