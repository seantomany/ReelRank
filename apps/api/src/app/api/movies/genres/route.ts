import { NextResponse } from 'next/server';
import { withRateLimitMiddleware } from '@/lib/middleware';
import { getGenres } from '@/lib/tmdb';

export const GET = withRateLimitMiddleware('general', async (_req, { requestId }) => {
  const genres = await getGenres();
  return NextResponse.json({ data: genres, requestId });
});
