import { NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { RankMovieInputSchema } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';
import { safeGetMovieById } from '@/lib/tmdb';
import type { SoloRanking } from '@reelrank/shared';

function computeBeliScore(position: number, total: number): number {
  if (total <= 1) return 10;
  return Math.round(((total - 1 - position) / (total - 1)) * 100) / 10;
}

export const POST = withAuthAndRateLimit('general', async (req, { user, requestId }) => {
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = RankMovieInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { movieId, insertAtIndex } = parsed.data;
  const db = getDb();
  const listRef = db.collection(COLLECTIONS.rankedLists).doc(user.id);
  const listDoc = await listRef.get();

  let movieIds: number[] = listDoc.exists ? (listDoc.data()!.movieIds ?? []) : [];

  const existingIdx = movieIds.indexOf(movieId);
  if (existingIdx !== -1) {
    movieIds.splice(existingIdx, 1);
  }

  const clampedIndex = Math.max(0, Math.min(insertAtIndex, movieIds.length));
  movieIds.splice(clampedIndex, 0, movieId);

  await listRef.set({
    userId: user.id,
    movieIds,
    updatedAt: new Date(),
  }, { merge: true });

  const movieResults = await Promise.all(
    movieIds.map((id) => safeGetMovieById(id))
  );

  const rankings: SoloRanking[] = movieResults.map(({ movie }, i) => ({
    movieId: movie.id,
    movie,
    beliScore: computeBeliScore(i, movieIds.length),
    eloScore: 0,
    swipeSignal: 0,
    rank: i + 1,
  }));

  return NextResponse.json({ data: rankings, requestId });
});
