import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitMiddleware } from '@/lib/middleware';
import { getMovieById } from '@/lib/tmdb';
import { ApiError } from '@/lib/errors';

export const GET = withRateLimitMiddleware('general', async (_req: NextRequest, { requestId, params }) => {
  const id = parseInt(params?.id ?? '', 10);
  if (isNaN(id) || id <= 0) {
    throw new ApiError(400, 'Invalid movie ID', requestId);
  }

  const movie = await getMovieById(id);
  return NextResponse.json({ data: movie, requestId });
});
