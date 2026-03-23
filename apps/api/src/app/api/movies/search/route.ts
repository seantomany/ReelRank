import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitMiddleware } from '@/lib/middleware';
import { searchMovies } from '@/lib/tmdb';
import { MovieSearchQuerySchema } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';

export const GET = withRateLimitMiddleware('movieSearch', async (req: NextRequest, { requestId }) => {
  const url = new URL(req.url);
  const parsed = MovieSearchQuerySchema.safeParse({
    query: url.searchParams.get('query'),
    page: url.searchParams.get('page') ?? '1',
  });

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid search parameters', requestId);
  }

  const result = await searchMovies(parsed.data.query, parsed.data.page);
  return NextResponse.json({ data: result, requestId });
});
