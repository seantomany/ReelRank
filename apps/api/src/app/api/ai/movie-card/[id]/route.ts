import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { safeGetMovieById } from '@/lib/tmdb';

export const GET = withAuth(async (_req, { requestId, params }) => {
  const id = Number(params?.id);
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: 'Invalid movie ID', requestId }, { status: 400 });
  }

  const { movie, hydrated } = await safeGetMovieById(id);
  if (!hydrated) {
    return NextResponse.json({ error: 'Movie not found', requestId }, { status: 404 });
  }

  return NextResponse.json({ data: movie, requestId });
});
