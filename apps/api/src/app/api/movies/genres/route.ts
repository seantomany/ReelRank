import { NextRequest, NextResponse } from 'next/server';
import { getGenres } from '@/lib/tmdb';
import { handleApiError, createRequestId } from '@/lib/errors';
import { withRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const rateLimited = await withRateLimit(req, 'general');
    if (rateLimited) return rateLimited;

    const genres = await getGenres();
    return NextResponse.json({ data: genres, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
