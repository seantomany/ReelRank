import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMovieById } from '@/lib/tmdb';
import { handleApiError } from '@/lib/errors';

export const GET = withAuth(async (req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const listType = searchParams.get('type') ?? 'want';

    const swipes = await prisma.soloSwipe.findMany({
      where: {
        userId: user.id,
        ...(listType === 'want' ? { direction: 'right' } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const movies = await Promise.all(
      swipes.map((s) => getMovieById(s.movieId).catch(() => null)),
    );

    const results = swipes
      .map((swipe, i) => ({ ...swipe, movie: movies[i] }))
      .filter((r) => r.movie);

    return NextResponse.json({ data: results, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
