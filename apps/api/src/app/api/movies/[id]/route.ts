import { NextRequest, NextResponse } from 'next/server';
import { getMovieById } from '@/lib/tmdb';
import { handleApiError, createRequestId, createApiError } from '@/lib/errors';
import { withRateLimit } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();

  try {
    const rateLimited = await withRateLimit(req, 'general');
    if (rateLimited) return rateLimited;

    const { id } = await params;
    const movieId = parseInt(id, 10);

    if (isNaN(movieId) || movieId <= 0) {
      return NextResponse.json({ error: 'Invalid movie ID', requestId }, { status: 400 });
    }

    try {
      const movie = await getMovieById(movieId);
      return NextResponse.json({ data: movie, requestId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('404')) {
        throw createApiError(404, 'Movie not found', requestId);
      }
      throw err;
    }
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
