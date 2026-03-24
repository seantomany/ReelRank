import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { safeGetMovieById } from '@/lib/tmdb';
import { ELO_K_FACTOR, ELO_INITIAL_RATING } from '@reelrank/shared';
import type { SoloRanking } from '@reelrank/shared';

function computeBeliScore(position: number, total: number): number {
  if (total <= 1) return 10;
  return Math.round(((total - 1 - position) / (total - 1)) * 100) / 10;
}

export const GET = withAuth(async (_req, { user, requestId }) => {
  const listDoc = await getDb().collection(COLLECTIONS.rankedLists).doc(user.id).get();

  if (listDoc.exists) {
    const movieIds: number[] = listDoc.data()!.movieIds ?? [];
    if (movieIds.length === 0) {
      return NextResponse.json({ data: [], requestId });
    }

    const movieResults = await Promise.all(
      movieIds.map((id) => safeGetMovieById(id))
    );

    const warnings: string[] = [];
    const rankings: SoloRanking[] = movieResults.map(({ movie, hydrated }, i) => {
      if (!hydrated) warnings.push(`Movie ${movie.id} could not be loaded from TMDB`);
      return {
        movieId: movie.id,
        movie,
        beliScore: computeBeliScore(i, movieIds.length),
        eloScore: 0,
        swipeSignal: 0,
        rank: i + 1,
      };
    });

    return NextResponse.json({
      data: rankings,
      ...(warnings.length > 0 ? { warnings } : {}),
      requestId,
    });
  }

  // Fallback: compute from Elo-based pairwise choices for users who haven't used the new system
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
    beliScore: 0,
    eloScore: elos.get(movie.id) ?? ELO_INITIAL_RATING,
    swipeSignal: swipeSignals.get(movie.id) ?? 0,
    rank: 0,
  }));

  rankings.sort((a, b) => b.eloScore - a.eloScore);
  rankings.forEach((r, i) => {
    r.rank = i + 1;
    r.beliScore = computeBeliScore(i, rankings.length);
  });

  return NextResponse.json({
    data: rankings,
    ...(warnings.length > 0 ? { warnings } : {}),
    requestId,
  });
});
