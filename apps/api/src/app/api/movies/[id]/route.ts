import { NextRequest, NextResponse } from 'next/server';
import { getMovieById } from '@/lib/tmdb';
import { handleApiError, createRequestId } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();

  try {
    const { id } = await params;
    const movieId = parseInt(id, 10);

    if (isNaN(movieId) || movieId <= 0) {
      return NextResponse.json({ error: 'Invalid movie ID', requestId }, { status: 400 });
    }

    const movie = await getMovieById(movieId);
    return NextResponse.json({ data: movie, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
