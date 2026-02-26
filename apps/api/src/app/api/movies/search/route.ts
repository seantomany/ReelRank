import { NextRequest, NextResponse } from 'next/server';
import { MovieSearchQuerySchema } from '@reelrank/shared';
import { searchMovies } from '@/lib/tmdb';
import { withRateLimit } from '@/lib/rate-limit';
import { handleApiError, createRequestId } from '@/lib/errors';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const rateLimited = await withRateLimit(req, 'movieSearch');
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(req.url);
    const parsed = MovieSearchQuerySchema.safeParse({
      query: searchParams.get('query'),
      page: searchParams.get('page'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

    const results = await searchMovies(parsed.data.query, parsed.data.page);
    return NextResponse.json({ data: results, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
