import { NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { PairwiseChoiceInputSchema, ELO_K_FACTOR, ELO_INITIAL_RATING } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';
import { safeGetMovieById } from '@/lib/tmdb';
import type { SoloRanking } from '@reelrank/shared';

export const POST = withAuthAndRateLimit('general', async (req, { user, requestId }) => {
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = PairwiseChoiceInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { movieAId, movieBId, chosenId } = parsed.data;
  const now = new Date();

  const docRef = getDb().collection(COLLECTIONS.pairwiseChoices).doc();
  await docRef.set({
    id: docRef.id,
    userId: user.id,
    movieAId,
    movieBId,
    chosenId,
    createdAt: now,
  });

  const countSnap = await getDb()
    .collection(COLLECTIONS.pairwiseChoices)
    .where('userId', '==', user.id)
    .count()
    .get();
  const totalChoices = countSnap.data().count;

  let updatedRankings: SoloRanking[] | undefined;
  if (totalChoices % 5 === 0) {
    updatedRankings = await computeUserRankings(user.id);
  }

  return NextResponse.json({
    data: {
      id: docRef.id,
      chosenId,
      ...(updatedRankings ? { rankings: updatedRankings } : {}),
    },
    requestId,
  });
});

async function computeUserRankings(userId: string): Promise<SoloRanking[]> {
  const [swipesSnap, choicesSnap] = await Promise.all([
    getDb().collection(COLLECTIONS.soloSwipes)
      .where('userId', '==', userId)
      .where('direction', '==', 'right')
      .get(),
    getDb().collection(COLLECTIONS.pairwiseChoices)
      .where('userId', '==', userId)
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
    const loseId = data.chosenId === data.movieAId ? data.movieBId : data.movieAId;

    const winElo = elos.get(winId) ?? ELO_INITIAL_RATING;
    const loseElo = elos.get(loseId) ?? ELO_INITIAL_RATING;

    const expectedWin = 1 / (1 + Math.pow(10, (loseElo - winElo) / 400));
    const expectedLose = 1 / (1 + Math.pow(10, (winElo - loseElo) / 400));

    elos.set(winId, winElo + ELO_K_FACTOR * (1 - expectedWin));
    elos.set(loseId, loseElo + ELO_K_FACTOR * (0 - expectedLose));
  }

  const movieResults = await Promise.all(
    Array.from(movieIds).map((id) => safeGetMovieById(id))
  );

  const rankings: SoloRanking[] = movieResults.map(({ movie }) => ({
    movieId: movie.id,
    movie,
    eloScore: elos.get(movie.id) ?? ELO_INITIAL_RATING,
    swipeSignal: swipeSignals.get(movie.id) ?? 0,
    rank: 0,
  }));

  rankings.sort((a, b) => b.eloScore - a.eloScore);
  rankings.forEach((r, i) => { r.rank = i + 1; });

  return rankings;
}
