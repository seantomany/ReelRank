import { NextRequest, NextResponse } from 'next/server';
import { ALGORITHM_VERSIONS, ABLY_EVENTS } from '@reelrank/shared';
import { authenticateRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { getMovieById } from '@/lib/tmdb';
import { publishToRoom } from '@/lib/ably';
import { handleApiError, createRequestId, createApiError } from '@/lib/errors';
import { withRateLimit } from '@/lib/rate-limit';
import { validateRoomCode, findRoomByCode } from '@/lib/route-helpers';
import type { MovieScore } from '@reelrank/shared';

function computeSimpleMajority(
  swipes: { movieId: number; direction: string }[],
  totalMembers: number,
  movieDetails: Map<number, { popularity: number; voteAverage: number }>,
): Omit<MovieScore, 'movie'>[] {
  const scores = new Map<number, { right: number; left: number }>();

  for (const swipe of swipes) {
    const current = scores.get(swipe.movieId) ?? { right: 0, left: 0 };
    if (swipe.direction === 'right') current.right++;
    else current.left++;
    scores.set(swipe.movieId, current);
  }

  const results: Omit<MovieScore, 'movie'>[] = [];

  for (const [movieId, { right, left }] of scores) {
    const rawScore = (right - left) / totalMembers;
    const details = movieDetails.get(movieId);
    const popularityBonus = details ? Math.min(details.popularity / 1000, 0.1) : 0;
    const ratingBonus = details ? (details.voteAverage / 10) * 0.05 : 0;

    results.push({
      movieId,
      score: rawScore,
      rightSwipes: right,
      leftSwipes: left,
      totalVoters: totalMembers,
      popularityBonus,
      ratingBonus,
      finalScore: rawScore + popularityBonus + ratingBonus,
    });
  }

  return results.sort((a, b) => b.finalScore - a.finalScore);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const requestId = createRequestId();

  try {
    const rateLimited = await withRateLimit(req, 'general');
    if (rateLimited) return rateLimited;

    await authenticateRequest(req);
    const { code: rawCode } = await params;
    const code = validateRoomCode(rawCode, requestId);

    const { roomId, roomData } = await findRoomByCode(getDb(), COLLECTIONS.rooms, code, requestId);

    if (roomData.status !== 'swiping' && roomData.status !== 'results') {
      throw createApiError(400, 'Results are not available for this room yet', requestId);
    }

    const existingResults = await getDb().collection(COLLECTIONS.roomResults(roomId))
      .orderBy('computedAt', 'desc')
      .limit(1)
      .get();

    if (!existingResults.empty) {
      const cached = existingResults.docs[0].data();
      const rankedMovies = (cached.scoreBreakdown as Record<string, unknown>[]) ?? [];
      return NextResponse.json({
        data: {
          id: existingResults.docs[0].id,
          roomId,
          rankedMovies,
          algorithmVersion: cached.algorithmVersion,
        },
        requestId,
      });
    }

    const [membersSnap, moviesSnap, swipesSnap] = await Promise.all([
      getDb().collection(COLLECTIONS.roomMembers(roomId)).get(),
      getDb().collection(COLLECTIONS.roomMovies(roomId)).get(),
      getDb().collection(COLLECTIONS.roomSwipes(roomId)).get(),
    ]);

    const swipes = swipesSnap.docs.map((d) => d.data() as { movieId: number; direction: string });
    const movieIds = moviesSnap.docs.map((m) => (m.data() as { movieId: number }).movieId);

    const movies = await Promise.all(
      movieIds.map((id) => getMovieById(id).catch(() => null)),
    );
    const movieMap = new Map(movies.filter(Boolean).map((m) => [m!.id, m!]));
    const movieDetails = new Map(
      movies.filter(Boolean).map((m) => [
        m!.id,
        { popularity: m!.popularity, voteAverage: m!.voteAverage },
      ]),
    );

    const rankedMovies = computeSimpleMajority(
      swipes,
      membersSnap.size,
      movieDetails,
    ).map((score) => {
      const movie = movieMap.get(score.movieId);
      return movie ? { ...score, movie } : null;
    }).filter(Boolean) as MovieScore[];

    const resultData = {
      roomId,
      algorithmVersion: ALGORITHM_VERSIONS.SIMPLE_MAJORITY,
      rankedMovieIds: rankedMovies.map((r) => r.movieId),
      scoreBreakdown: rankedMovies as unknown as Record<string, unknown>[],
      computedAt: new Date(),
    };

    const resultRef = await getDb().collection(COLLECTIONS.roomResults(roomId)).add(resultData);

    if (roomData.status === 'swiping') {
      await getDb().collection(COLLECTIONS.rooms).doc(roomId).update({
        status: 'results',
        updatedAt: new Date(),
      });
      await publishToRoom(code, ABLY_EVENTS.RESULTS_READY, { resultId: resultRef.id });
    }

    return NextResponse.json({
      data: { id: resultRef.id, roomId, rankedMovies, algorithmVersion: ALGORITHM_VERSIONS.SIMPLE_MAJORITY },
      requestId,
    });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
