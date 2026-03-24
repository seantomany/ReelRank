import { NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { PairwiseChoiceInputSchema } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';
import { safeGetMovieById } from '@/lib/tmdb';
import type { SoloRanking } from '@reelrank/shared';

function computeBeliScore(position: number, total: number): number {
  if (total <= 1) return 10;
  return Math.round(((total - 1 - position) / (total - 1)) * 100) / 10;
}

export const POST = withAuthAndRateLimit('general', async (req, { user, requestId }) => {
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = PairwiseChoiceInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { movieAId, movieBId, chosenId } = parsed.data;
  const loserId = chosenId === movieAId ? movieBId : movieAId;
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

  // Update the ranked list: if winner is below loser, swap so winner is higher
  const listRef = getDb().collection(COLLECTIONS.rankedLists).doc(user.id);
  const listDoc = await listRef.get();

  if (listDoc.exists) {
    const movieIds: number[] = listDoc.data()!.movieIds ?? [];
    const winnerIdx = movieIds.indexOf(chosenId);
    const loserIdx = movieIds.indexOf(loserId);

    if (winnerIdx !== -1 && loserIdx !== -1 && winnerIdx > loserIdx) {
      movieIds.splice(winnerIdx, 1);
      movieIds.splice(loserIdx, 0, chosenId);

      await listRef.update({ movieIds, updatedAt: now });
    }
  }

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
  const listDoc = await getDb().collection(COLLECTIONS.rankedLists).doc(userId).get();

  if (listDoc.exists) {
    const movieIds: number[] = listDoc.data()!.movieIds ?? [];
    const movieResults = await Promise.all(movieIds.map((id) => safeGetMovieById(id)));

    return movieResults.map(({ movie }, i) => ({
      movieId: movie.id,
      movie,
      beliScore: computeBeliScore(i, movieIds.length),
      eloScore: 0,
      swipeSignal: 0,
      rank: i + 1,
    }));
  }

  return [];
}
