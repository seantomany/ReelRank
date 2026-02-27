import { NextRequest, NextResponse } from 'next/server';
import { ELO_INITIAL_RATING, ELO_K_FACTOR } from '@reelrank/shared';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { getMovieById } from '@/lib/tmdb';
import { handleApiError } from '@/lib/errors';
import type { SoloRanking } from '@reelrank/shared';

function computeEloRatings(
  choices: { movieAId: number; movieBId: number; chosenId: number }[],
): Map<number, number> {
  const ratings = new Map<number, number>();

  const getOrInit = (id: number) => {
    if (!ratings.has(id)) ratings.set(id, ELO_INITIAL_RATING);
    return ratings.get(id)!;
  };

  for (const choice of choices) {
    const rA = getOrInit(choice.movieAId);
    const rB = getOrInit(choice.movieBId);

    const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
    const eB = 1 / (1 + Math.pow(10, (rA - rB) / 400));

    const sA = choice.chosenId === choice.movieAId ? 1 : 0;
    const sB = 1 - sA;

    ratings.set(choice.movieAId, rA + ELO_K_FACTOR * (sA - eA));
    ratings.set(choice.movieBId, rB + ELO_K_FACTOR * (sB - eB));
  }

  return ratings;
}

export const GET = withAuth(async (_req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const [choicesSnap, swipesSnap] = await Promise.all([
      getDb().collection(COLLECTIONS.pairwiseChoices)
        .where('userId', '==', user.id)
        .orderBy('createdAt', 'asc')
        .get(),
      getDb().collection(COLLECTIONS.soloSwipes)
        .where('userId', '==', user.id)
        .where('direction', '==', 'right')
        .get(),
    ]);

    const choices = choicesSnap.docs.map((d) => d.data() as { movieAId: number; movieBId: number; chosenId: number });
    const swipes = swipesSnap.docs.map((d) => d.data() as { movieId: number });

    const eloRatings = computeEloRatings(choices);
    const likedMovieIds = new Set(swipes.map((s) => s.movieId));
    const allMovieIds = new Set([...eloRatings.keys(), ...likedMovieIds]);

    const movies = await Promise.all(
      Array.from(allMovieIds).map((id) => getMovieById(id).catch(() => null)),
    );

    const movieMap = new Map(movies.filter(Boolean).map((m) => [m!.id, m!]));

    const rankings: SoloRanking[] = Array.from(allMovieIds)
      .map((movieId) => ({
        movieId,
        movie: movieMap.get(movieId)!,
        eloScore: eloRatings.get(movieId) ?? ELO_INITIAL_RATING,
        swipeSignal: likedMovieIds.has(movieId) ? 1 : 0,
        rank: 0,
      }))
      .filter((r) => r.movie)
      .sort((a, b) => b.eloScore - a.eloScore)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return NextResponse.json({ data: rankings, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
