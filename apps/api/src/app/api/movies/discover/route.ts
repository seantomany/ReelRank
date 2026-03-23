import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitMiddleware } from '@/lib/middleware';
import { discoverMovies } from '@/lib/tmdb';
import { ApiError } from '@/lib/errors';

export const GET = withRateLimitMiddleware('general', async (req: NextRequest, { requestId }) => {
  const url = new URL(req.url);
  const genre = url.searchParams.get('genre');
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);

  if (!genre || isNaN(parseInt(genre, 10))) {
    throw new ApiError(400, 'Invalid genre parameter', requestId);
  }

  const result = await discoverMovies(parseInt(genre, 10), page);
  return NextResponse.json({ data: result, requestId });
});
