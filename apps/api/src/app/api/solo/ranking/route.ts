import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { safeGetMovieById } from '@/lib/tmdb';
import { ELO_K_FACTOR, ELO_INITIAL_RATING } from '@reelrank/shared';
import type { SoloRanking } from '@reelrank/shared';

export const GET = withAuth(async (_req, { user, requestId }) => {
  const [swipesSnap, choicesSnap] = await Promise.all([
    getDb().collection(COLLECTIONS.soloSwipes)
      .where('userId', '==', user.id)
      .where('direction', '==', 'right')
      .get(),
    getDb().collection(COLLECTIONS.pairwiseChoices)
      .where('userId', '==', user.id)
      .get(),
  ]);

  const movieIds = new Set<number>();
  const swipeSignals = new Map<number, number>();

  for (const doc of swipesSnap.docs) {
    const data = doc.data();
    movieIds.add(data.movieId);
    swipeSignals.set(data.movieId, 1);
  }

  const elos = new Map<number, number>();
  for (const doc of choicesSnap.docs) {
    const data = doc.data();
    movieIds.add(data.movieAId);
    movieIds.add(data.movieBId);

    const winId = data.chosenId;
    const loseId = winId === data.movieAId ? data.movieBId : data.movieAId;

    const winElo = elos.get(winId) ?? ELO_INITIAL_RATING;
    const loseElo = elos.get(loseId) ?? ELO_INITIAL_RATING;

    const expectedWin = 1 / (1 + Math.pow(10, (loseElo - winElo) / 400));
    const expectedLose = 1 / (1 + Math.pow(10, (winElo - loseElo) / 400));

    elos.set(winId, winElo + ELO_K_FACTOR * (1 - expectedWin));
    elos.set(loseId, loseElo + ELO_K_FACTOR * (0 - expectedLose));
  }

  if (movieIds.size === 0) {
    return NextResponse.json({ data: [], requestId });
  }

  const warnings: string[] = [];
  const movieResults = await Promise.all(
    Array.from(movieIds).map((id) => safeGetMovieById(id))
  );

  const failedCount = movieResults.filter((r) => !r.hydrated).length;
  if (failedCount > 0) {
    warnings.push(`${failedCount} movie(s) could not be loaded from TMDB`);
  }

  const rankings: SoloRanking[] = movieResults.map(({ movie }) => ({
    movieId: movie.id,
    movie,
    eloScore: elos.get(movie.id) ?? ELO_INITIAL_RATING,
    swipeSignal: swipeSignals.get(movie.id) ?? 0,
    rank: 0,
  }));

  rankings.sort((a, b) => b.eloScore - a.eloScore);
  rankings.forEach((r, i) => { r.rank = i + 1; });

  return NextResponse.json({
    data: rankings,
    ...(warnings.length > 0 ? { warnings } : {}),
    requestId,
  });
});
