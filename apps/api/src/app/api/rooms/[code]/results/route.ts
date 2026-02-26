import { NextRequest, NextResponse } from 'next/server';
import { ALGORITHM_VERSIONS, ABLY_EVENTS } from '@reelrank/shared';
import { authenticateRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMovieById } from '@/lib/tmdb';
import { publishToRoom } from '@/lib/ably';
import { handleApiError, createRequestId } from '@/lib/errors';
import type { MovieScore } from '@reelrank/shared';

function computeSimpleMajority(
  swipes: { movieId: number; direction: string }[],
  totalMembers: number,
  movieDetails: Map<number, { popularity: number; voteAverage: number }>,
): MovieScore[] {
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

  return results
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((r) => ({ ...r, movie: null as unknown as MovieScore['movie'] }));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const requestId = createRequestId();

  try {
    await authenticateRequest(req);
    const { code } = await params;

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        members: true,
        movies: true,
        swipes: true,
        results: { orderBy: { computedAt: 'desc' }, take: 1 },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found', requestId }, { status: 404 });
    }

    const movieIds = room.movies.map((m) => m.movieId);
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
      room.swipes,
      room.members.length,
      movieDetails,
    ).map((score) => ({
      ...score,
      movie: movieMap.get(score.movieId)!,
    })).filter((r) => r.movie);

    const result = await prisma.roomResult.create({
      data: {
        roomId: room.id,
        algorithmVersion: ALGORITHM_VERSIONS.SIMPLE_MAJORITY,
        rankedMovieIds: rankedMovies.map((r) => r.movieId),
        scoreBreakdown: rankedMovies as unknown as Record<string, unknown>[],
      },
    });

    if (room.status === 'swiping') {
      await prisma.room.update({ where: { code }, data: { status: 'results' } });
      await publishToRoom(code, ABLY_EVENTS.RESULTS_READY, { resultId: result.id });
    }

    return NextResponse.json({
      data: { id: result.id, roomId: room.id, rankedMovies, algorithmVersion: result.algorithmVersion },
      requestId,
    });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
