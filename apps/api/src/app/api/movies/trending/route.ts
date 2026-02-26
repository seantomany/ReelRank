import { NextRequest, NextResponse } from 'next/server';
import { getTrendingMovies } from '@/lib/tmdb';
import { handleApiError, createRequestId } from '@/lib/errors';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);

    const results = await getTrendingMovies(page);
    return NextResponse.json({ data: results, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
