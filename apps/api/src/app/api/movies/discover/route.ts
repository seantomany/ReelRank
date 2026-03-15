import { NextRequest, NextResponse } from 'next/server';
import { TrendingPageSchema } from '@reelrank/shared';
import { discoverMovies } from '@/lib/tmdb';
import { handleApiError, createRequestId } from '@/lib/errors';
import { withRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const rateLimited = await withRateLimit(req, 'general');
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(req.url);
    const pageResult = TrendingPageSchema.safeParse(searchParams.get('page') ?? '1');
    if (!pageResult.success) {
      return NextResponse.json(
        { error: 'Invalid page parameter', requestId },
        { status: 400 },
      );
    }

    const genreParam = searchParams.get('genre');
    const genreId = genreParam ? parseInt(genreParam, 10) : undefined;
    if (genreParam && (isNaN(genreId!) || genreId! <= 0)) {
      return NextResponse.json(
        { error: 'Invalid genre ID', requestId },
        { status: 400 },
      );
    }

    const results = await discoverMovies(genreId, pageResult.data);
    return NextResponse.json({ data: results, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
