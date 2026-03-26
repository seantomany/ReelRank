import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { getRecommendations, getTrending, safeGetMovieById } from '@/lib/tmdb';

const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

export const GET = withAuth(async (_req: NextRequest, { user, requestId }) => {
  const today = new Date().toISOString().split('T')[0];

  let likedMovieIds: number[] = [];
  const allSeenIds = new Set<number>();

  try {
    const swipesSnap = await getDb()
      .collection(COLLECTIONS.soloSwipes)
      .where('userId', '==', user.id)
      .where('direction', '==', 'right')
      .limit(20)
      .get();
    likedMovieIds = swipesSnap.docs.map((d) => d.data().movieId as number);
    likedMovieIds.forEach((id) => allSeenIds.add(id));
  } catch {
    // index may not exist yet
  }

  try {
    const watchedSnap = await getDb()
      .collection(COLLECTIONS.watchedMovies)
      .where('userId', '==', user.id)
      .get();
    watchedSnap.docs.forEach((d) => allSeenIds.add(d.data().movieId as number));
  } catch {
    // ignore
  }

  let recMovie = null;
  let reason = '';

  if (likedMovieIds.length > 0) {
    const seed = likedMovieIds[Math.floor(seededRandom(today) * likedMovieIds.length)];
    try {
      const { movies } = await getRecommendations(seed);
      const unseen = movies.filter((m) => !allSeenIds.has(m.id) && m.voteAverage > 5);
      if (unseen.length > 0) {
        recMovie = unseen[Math.floor(seededRandom(today + 'pick') * unseen.length)];
        const seedMovie = await safeGetMovieById(seed);
        const genres = recMovie.genreIds.map((g) => GENRE_NAMES[g]).filter(Boolean).slice(0, 2).join(' & ');
        reason = `Because you liked ${seedMovie.movie.title}${genres ? ` and enjoy ${genres}` : ''}`;
      }
    } catch {
      // fall through to trending
    }
  }

  if (!recMovie) {
    const { movies } = await getTrending();
    const unseen = movies.filter((m) => !allSeenIds.has(m.id));
    if (unseen.length > 0) {
      recMovie = unseen[Math.floor(seededRandom(today + 'trend') * unseen.length)];
      reason = 'Trending this week — give it a shot';
    }
  }

  if (!recMovie) {
    return NextResponse.json({ data: null, requestId });
  }

  return NextResponse.json({
    data: {
      movie: recMovie,
      reason,
      date: today,
    },
    requestId,
  });
});

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash % 10000) / 10000;
}
