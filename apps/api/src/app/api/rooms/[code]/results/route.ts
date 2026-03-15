import { NextRequest, NextResponse } from 'next/server';
import { ALGORITHM_VERSIONS, ABLY_EVENTS, ELO_INITIAL_RATING, ELO_K_FACTOR } from '@reelrank/shared';
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

function computeEloGroup(
  swipes: { movieId: number; userId: string; direction: string }[],
  totalMembers: number,
): Omit<MovieScore, 'movie'>[] {
  const ratings = new Map<number, number>();
  const swipeCounts = new Map<number, { right: number; left: number }>();

  const getOrInit = (id: number) => {
    if (!ratings.has(id)) ratings.set(id, ELO_INITIAL_RATING);
    return ratings.get(id)!;
  };

  const userMovieSwipes = new Map<string, Map<number, string>>();
  for (const swipe of swipes) {
    if (!userMovieSwipes.has(swipe.userId)) {
      userMovieSwipes.set(swipe.userId, new Map());
    }
    userMovieSwipes.get(swipe.userId)!.set(swipe.movieId, swipe.direction);

    const current = swipeCounts.get(swipe.movieId) ?? { right: 0, left: 0 };
    if (swipe.direction === 'right') current.right++;
    else current.left++;
    swipeCounts.set(swipe.movieId, current);
  }

  const movieIds = Array.from(new Set(swipes.map((s) => s.movieId)));
  for (const userId of userMovieSwipes.keys()) {
    const userSwipes = userMovieSwipes.get(userId)!;
    for (let i = 0; i < movieIds.length; i++) {
      for (let j = i + 1; j < movieIds.length; j++) {
        const a = movieIds[i];
        const b = movieIds[j];
        const dirA = userSwipes.get(a);
        const dirB = userSwipes.get(b);
        if (!dirA || !dirB) continue;
        if (dirA === dirB) continue;

        const rA = getOrInit(a);
        const rB = getOrInit(b);
        const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
        const eB = 1 / (1 + Math.pow(10, (rA - rB) / 400));

        const sA = dirA === 'right' ? 1 : 0;
        const sB = 1 - sA;

        ratings.set(a, rA + ELO_K_FACTOR * (sA - eA));
        ratings.set(b, rB + ELO_K_FACTOR * (sB - eB));
      }
    }
  }

  for (const movieId of movieIds) {
    getOrInit(movieId);
  }

  return Array.from(ratings.entries())
    .map(([movieId, elo]) => {
      const counts = swipeCounts.get(movieId) ?? { right: 0, left: 0 };
      return {
        movieId,
        score: (elo - ELO_INITIAL_RATING) / 100,
        rightSwipes: counts.right,
        leftSwipes: counts.left,
        totalVoters: totalMembers,
        popularityBonus: 0,
        ratingBonus: 0,
        finalScore: elo,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

function computeRankedChoice(
  swipes: { movieId: number; userId: string; direction: string }[],
  totalMembers: number,
): Omit<MovieScore, 'movie'>[] {
  const userRankings = new Map<string, number[]>();
  const swipeCounts = new Map<number, { right: number; left: number }>();

  for (const swipe of swipes) {
    const current = swipeCounts.get(swipe.movieId) ?? { right: 0, left: 0 };
    if (swipe.direction === 'right') current.right++;
    else current.left++;
    swipeCounts.set(swipe.movieId, current);

    if (swipe.direction === 'right') {
      if (!userRankings.has(swipe.userId)) {
        userRankings.set(swipe.userId, []);
      }
      userRankings.get(swipe.userId)!.push(swipe.movieId);
    }
  }

  const allMovieIds = Array.from(swipeCounts.keys());
  let remaining = new Set(allMovieIds);
  const eliminationOrder: number[] = [];

  while (remaining.size > 1) {
    const firstPlaceVotes = new Map<number, number>();
    for (const movieId of remaining) {
      firstPlaceVotes.set(movieId, 0);
    }

    for (const [, ranked] of userRankings) {
      const firstChoice = ranked.find((m) => remaining.has(m));
      if (firstChoice !== undefined) {
        firstPlaceVotes.set(firstChoice, (firstPlaceVotes.get(firstChoice) ?? 0) + 1);
      }
    }

    const majority = Math.ceil(userRankings.size / 2);
    for (const [movieId, votes] of firstPlaceVotes) {
      if (votes >= majority) {
        eliminationOrder.unshift(movieId);
        remaining.delete(movieId);
        for (const id of remaining) {
          eliminationOrder.unshift(id);
        }
        remaining = new Set();
        break;
      }
    }

    if (remaining.size === 0) break;

    let minVotes = Infinity;
    for (const [, votes] of firstPlaceVotes) {
      if (votes < minVotes) minVotes = votes;
    }
    for (const [movieId, votes] of firstPlaceVotes) {
      if (votes === minVotes && remaining.size > 1) {
        remaining.delete(movieId);
        eliminationOrder.unshift(movieId);
        break;
      }
    }
  }

  if (remaining.size === 1) {
    eliminationOrder.unshift(Array.from(remaining)[0]);
  }

  const uniqueOrder = [...new Set(eliminationOrder)];

  return uniqueOrder.map((movieId, idx) => {
    const counts = swipeCounts.get(movieId) ?? { right: 0, left: 0 };
    return {
      movieId,
      score: (uniqueOrder.length - idx) / uniqueOrder.length,
      rightSwipes: counts.right,
      leftSwipes: counts.left,
      totalVoters: totalMembers,
      popularityBonus: 0,
      ratingBonus: 0,
      finalScore: uniqueOrder.length - idx,
    };
  });
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

    const swipes = swipesSnap.docs.map((d) => {
      const data = d.data();
      return { movieId: data.movieId as number, direction: data.direction as string, userId: data.userId as string };
    });
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

    const algorithmVersion = roomData.algorithmVersion ?? ALGORITHM_VERSIONS.SIMPLE_MAJORITY;
    let rawRanked: Omit<MovieScore, 'movie'>[];

    switch (algorithmVersion) {
      case ALGORITHM_VERSIONS.ELO_GROUP:
        rawRanked = computeEloGroup(swipes, membersSnap.size);
        break;
      case ALGORITHM_VERSIONS.RANKED_CHOICE:
        rawRanked = computeRankedChoice(swipes, membersSnap.size);
        break;
      default:
        rawRanked = computeSimpleMajority(swipes, membersSnap.size, movieDetails);
        break;
    }

    const rankedMovies = rawRanked
      .map((score) => {
        const movie = movieMap.get(score.movieId);
        return movie ? { ...score, movie } : null;
      })
      .filter(Boolean) as MovieScore[];

    const resultData = {
      roomId,
      algorithmVersion,
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
      data: { id: resultRef.id, roomId, rankedMovies, algorithmVersion },
      requestId,
    });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
