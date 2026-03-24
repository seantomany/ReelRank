import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { safeGetMovieById } from '@/lib/tmdb';
import type { SoloInsights } from '@reelrank/shared';

const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDecade(releaseDate: string | undefined): string | null {
  if (!releaseDate) return null;
  const year = parseInt(releaseDate.slice(0, 4), 10);
  if (isNaN(year)) return null;
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function computePersonality(
  genreBreakdown: SoloInsights['genreBreakdown'],
  venueBreakdown: SoloInsights['venueBreakdown'],
  dayOfWeek: SoloInsights['dayOfWeekActivity'],
  avgRating: number,
  swipeRate: SoloInsights['swipeRate'],
  decadeBreakdown: SoloInsights['decadeBreakdown'],
  watchedCount: number,
): SoloInsights['moviePersonality'] {
  const traits: string[] = [];
  let title = 'The Movie Explorer';
  let description = 'You\'re just getting started on your movie journey.';

  if (genreBreakdown.length === 0 && watchedCount === 0) {
    return { title, description, traits: ['Newcomer'] };
  }

  const topGenre = genreBreakdown[0]?.genreName ?? '';
  const topGenre2 = genreBreakdown[1]?.genreName ?? '';
  const topVenue = venueBreakdown[0]?.venue ?? '';
  const topDecade = decadeBreakdown.sort((a, b) => b.count - a.count)[0]?.decade ?? '';

  // Genre-based personality
  const genreMap: Record<string, { title: string; desc: string }> = {
    'Action': { title: 'The Adrenaline Junkie', desc: 'You live for high-octane thrills and explosive set pieces.' },
    'Comedy': { title: 'The Laugh Chaser', desc: 'Life\'s too short for serious movies — you want to be entertained.' },
    'Drama': { title: 'The Deep Thinker', desc: 'You crave emotional depth and nuanced storytelling.' },
    'Horror': { title: 'The Thrill Seeker', desc: 'You love the rush of a good scare and the darker side of cinema.' },
    'Science Fiction': { title: 'The Futurist', desc: 'You\'re drawn to big ideas, other worlds, and what-if scenarios.' },
    'Romance': { title: 'The Romantic', desc: 'You believe in the power of love stories and emotional connections.' },
    'Thriller': { title: 'The Edge-Sitter', desc: 'You can\'t resist suspense, twists, and nail-biting tension.' },
    'Animation': { title: 'The Imagineer', desc: 'Animated worlds and visual storytelling speak to your soul.' },
    'Documentary': { title: 'The Truth Seeker', desc: 'Real stories and real people fascinate you more than fiction.' },
    'Fantasy': { title: 'The Dreamer', desc: 'Epic worlds, magic, and mythology are your escape of choice.' },
    'Crime': { title: 'The Detective', desc: 'You\'re fascinated by the criminal mind and stories of justice.' },
    'Mystery': { title: 'The Puzzle Solver', desc: 'Whodunits and mind-bending plots keep you coming back.' },
  };

  const match = genreMap[topGenre];
  if (match) {
    title = match.title;
    description = match.desc;
  }

  traits.push(`${topGenre} lover`);
  if (topGenre2) traits.push(`${topGenre2} fan`);

  if (swipeRate.ratio > 70) traits.push('Easy to please');
  else if (swipeRate.ratio < 30) traits.push('Picky critic');
  else traits.push('Balanced taste');

  if (avgRating >= 8) traits.push('Generous rater');
  else if (avgRating > 0 && avgRating <= 5) traits.push('Tough grader');

  if (topVenue === 'Theater') traits.push('Theater regular');
  else if (topVenue === 'Home') traits.push('Couch cinephile');

  if (topDecade) traits.push(`${topDecade} enthusiast`);

  const weekendCount = dayOfWeek.filter(d => d.day === 'Sat' || d.day === 'Sun').reduce((s, d) => s + d.count, 0);
  const weekdayCount = dayOfWeek.filter(d => d.day !== 'Sat' && d.day !== 'Sun').reduce((s, d) => s + d.count, 0);
  if (weekendCount > weekdayCount * 1.5) traits.push('Weekend warrior');
  else if (weekdayCount > weekendCount * 1.5) traits.push('Weeknight watcher');

  if (watchedCount >= 50) traits.push('Cinephile');
  else if (watchedCount >= 20) traits.push('Avid watcher');

  return { title, description, traits: traits.slice(0, 6) };
}

export const GET = withAuth(async (_req, { user, requestId }) => {
  const [swipesSnap, watchedSnap, rankedListDoc] = await Promise.all([
    getDb().collection(COLLECTIONS.soloSwipes).where('userId', '==', user.id).get(),
    getDb().collection(COLLECTIONS.watchedMovies).where('userId', '==', user.id).get(),
    getDb().collection(COLLECTIONS.rankedLists).doc(user.id).get(),
  ]);

  const movieIds = new Set<number>();
  const swipesByMovie = new Map<number, 'left' | 'right'>();

  for (const doc of swipesSnap.docs) {
    const data = doc.data();
    movieIds.add(data.movieId);
    swipesByMovie.set(data.movieId, data.direction);
  }

  const watchedDocs: { movieId: number; rating: number; watchedAt: string; venue: string }[] = [];
  for (const doc of watchedSnap.docs) {
    const data = doc.data();
    movieIds.add(data.movieId);
    watchedDocs.push({
      movieId: data.movieId,
      rating: data.rating ?? 0,
      watchedAt: data.watchedAt ?? data.createdAt?.toDate?.()?.toISOString?.() ?? '',
      venue: data.venue ?? '',
    });
  }

  const movieResults = await Promise.all(
    Array.from(movieIds).slice(0, 200).map((id) => safeGetMovieById(id))
  );
  const movieMap = new Map(movieResults.map(({ movie }) => [movie.id, movie]));

  // --- Genre breakdown from swipes ---
  const genreCounts = new Map<number, { right: number; left: number }>();
  for (const [movieId, direction] of swipesByMovie) {
    const movie = movieMap.get(movieId);
    if (!movie) continue;
    for (const genreId of movie.genreIds) {
      const counts = genreCounts.get(genreId) ?? { right: 0, left: 0 };
      if (direction === 'right') counts.right++;
      else counts.left++;
      genreCounts.set(genreId, counts);
    }
  }

  const totalSwipes = swipesSnap.size;
  const genreBreakdown = Array.from(genreCounts.entries())
    .map(([genreId, counts]) => ({
      genreId,
      genreName: GENRE_NAMES[genreId] ?? `Genre ${genreId}`,
      rightCount: counts.right,
      leftCount: counts.left,
      percentage: totalSwipes > 0 ? Math.round((counts.right / totalSwipes) * 100) : 0,
    }))
    .sort((a, b) => b.rightCount - a.rightCount);

  // --- Swipe rate ---
  const rightSwipes = Array.from(swipesByMovie.values()).filter((d) => d === 'right').length;
  const leftSwipes = Array.from(swipesByMovie.values()).filter((d) => d === 'left').length;

  // --- Rating distribution from ranked list ---
  const ratingDistribution: { bucket: string; count: number }[] = [];
  if (rankedListDoc.exists) {
    const rankedIds: number[] = rankedListDoc.data()!.movieIds ?? [];
    const total = rankedIds.length;
    const buckets = new Map<string, number>();
    rankedIds.forEach((_, i) => {
      const score = total <= 1 ? 10 : ((total - 1 - i) / (total - 1)) * 10;
      const bucket = `${Math.floor(score)}-${Math.floor(score) + 1}`;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    });
    for (let b = 0; b <= 9; b++) {
      const key = `${b}-${b + 1}`;
      ratingDistribution.push({ bucket: key, count: buckets.get(key) ?? 0 });
    }
  }

  // --- Watch patterns by month ---
  const monthCounts = new Map<string, { count: number; totalRating: number }>();
  const venueCounts = new Map<string, number>();
  const dayCounts = new Map<number, number>();

  for (const w of watchedDocs) {
    const month = w.watchedAt.slice(0, 7);
    if (month) {
      const entry = monthCounts.get(month) ?? { count: 0, totalRating: 0 };
      entry.count++;
      entry.totalRating += w.rating;
      monthCounts.set(month, entry);
    }
    if (w.venue) {
      venueCounts.set(w.venue, (venueCounts.get(w.venue) ?? 0) + 1);
    }
    if (w.watchedAt) {
      const date = new Date(w.watchedAt);
      if (!isNaN(date.getTime())) {
        const day = date.getDay();
        dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
      }
    }
  }

  const watchPatterns = Array.from(monthCounts.entries())
    .map(([month, entry]) => ({
      month,
      count: entry.count,
      avgRating: entry.count > 0 ? Math.round((entry.totalRating / entry.count) * 10) / 10 : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const venueBreakdown = Array.from(venueCounts.entries())
    .map(([venue, count]) => ({ venue, count }))
    .sort((a, b) => b.count - a.count);

  // --- Top genres by Beli score ---
  const topGenresByScore: { genreId: number; genreName: string; avgScore: number }[] = [];
  if (rankedListDoc.exists) {
    const rankedIds: number[] = rankedListDoc.data()!.movieIds ?? [];
    const total = rankedIds.length;
    const genreScores = new Map<number, number[]>();
    rankedIds.forEach((movieId, i) => {
      const score = total <= 1 ? 10 : Math.round(((total - 1 - i) / (total - 1)) * 100) / 10;
      const movie = movieMap.get(movieId);
      if (!movie) return;
      for (const gid of movie.genreIds) {
        const arr = genreScores.get(gid) ?? [];
        arr.push(score);
        genreScores.set(gid, arr);
      }
    });
    for (const [genreId, scores] of genreScores) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      topGenresByScore.push({
        genreId,
        genreName: GENRE_NAMES[genreId] ?? `Genre ${genreId}`,
        avgScore: Math.round(avg * 10) / 10,
      });
    }
    topGenresByScore.sort((a, b) => b.avgScore - a.avgScore);
  }

  // --- NEW: Decade breakdown ---
  const decadeCounts = new Map<string, number>();
  for (const [movieId, direction] of swipesByMovie) {
    if (direction !== 'right') continue;
    const movie = movieMap.get(movieId);
    const decade = getDecade(movie?.releaseDate);
    if (decade) decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
  }
  for (const w of watchedDocs) {
    const movie = movieMap.get(w.movieId);
    const decade = getDecade(movie?.releaseDate);
    if (decade) decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
  }
  const decadeBreakdown = Array.from(decadeCounts.entries())
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => b.decade.localeCompare(a.decade));

  // --- NEW: Average rating ---
  const ratings = watchedDocs.filter(w => w.rating > 0).map(w => w.rating);
  const averageRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;

  // --- NEW: Rating by genre (user's own 1-10 ratings) ---
  const genreRatings = new Map<number, number[]>();
  for (const w of watchedDocs) {
    if (w.rating <= 0) continue;
    const movie = movieMap.get(w.movieId);
    if (!movie) continue;
    for (const gid of movie.genreIds) {
      const arr = genreRatings.get(gid) ?? [];
      arr.push(w.rating);
      genreRatings.set(gid, arr);
    }
  }
  const ratingByGenre = Array.from(genreRatings.entries())
    .map(([genreId, scores]) => ({
      genreId,
      genreName: GENRE_NAMES[genreId] ?? `Genre ${genreId}`,
      avgRating: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      count: scores.length,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);

  // --- NEW: Day of week activity ---
  const dayOfWeekActivity = Array.from({ length: 7 }, (_, i) => ({
    day: DAY_NAMES[i],
    count: dayCounts.get(i) ?? 0,
  }));

  // --- NEW: Watchlist conversion ---
  const rightSwipedIds = new Set(
    Array.from(swipesByMovie.entries()).filter(([, d]) => d === 'right').map(([id]) => id)
  );
  const watchedMovieIds = new Set(watchedDocs.map(w => w.movieId));
  const convertedCount = Array.from(rightSwipedIds).filter(id => watchedMovieIds.has(id)).length;
  const watchlistConversion = {
    rightSwiped: rightSwipedIds.size,
    watched: convertedCount,
    rate: rightSwipedIds.size > 0 ? Math.round((convertedCount / rightSwipedIds.size) * 100) : 0,
  };

  // --- NEW: Crowd agreement ---
  const crowdMovies: SoloInsights['crowdAgreement']['movies'] = [];
  for (const w of watchedDocs) {
    if (w.rating <= 0) continue;
    const movie = movieMap.get(w.movieId);
    if (!movie || movie.voteAverage <= 0) continue;
    const diff = Math.round((w.rating - movie.voteAverage) * 10) / 10;
    crowdMovies.push({
      movieId: w.movieId,
      title: movie.title,
      userRating: w.rating,
      tmdbRating: Math.round(movie.voteAverage * 10) / 10,
      diff,
    });
  }
  crowdMovies.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const avgDiff = crowdMovies.length > 0
    ? Math.round((crowdMovies.reduce((s, m) => s + m.diff, 0) / crowdMovies.length) * 10) / 10
    : 0;

  // --- NEW: Movie personality ---
  const moviePersonality = computePersonality(
    genreBreakdown,
    venueBreakdown,
    dayOfWeekActivity,
    averageRating,
    { rightSwipes, leftSwipes, ratio: totalSwipes > 0 ? Math.round((rightSwipes / totalSwipes) * 100) : 0 },
    decadeBreakdown,
    watchedDocs.length,
  );

  const insights: SoloInsights = {
    genreBreakdown,
    swipeRate: { rightSwipes, leftSwipes, ratio: totalSwipes > 0 ? Math.round((rightSwipes / totalSwipes) * 100) : 0 },
    ratingDistribution,
    watchPatterns,
    venueBreakdown,
    topGenresByScore,
    decadeBreakdown,
    averageRating,
    ratingByGenre,
    dayOfWeekActivity,
    watchlistConversion,
    crowdAgreement: { movies: crowdMovies.slice(0, 20), avgDiff },
    moviePersonality,
  };

  return NextResponse.json({ data: insights, requestId });
});
