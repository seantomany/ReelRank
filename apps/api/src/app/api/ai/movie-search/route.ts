import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { searchMovies } from '@/lib/tmdb';

export const GET = withAuth(async (req: NextRequest, { requestId }) => {
  const query = req.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'Missing query', requestId }, { status: 400 });
  }

  const titleMatch = query.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  const title = titleMatch ? titleMatch[1].trim() : query.trim();
  const year = titleMatch ? titleMatch[2] : null;

  const { movies } = await searchMovies(title, 1);

  if (movies.length === 0) {
    return NextResponse.json({ error: 'Movie not found', requestId }, { status: 404 });
  }

  if (year) {
    const yearMatch = movies.find(m => m.releaseDate?.startsWith(year));
    if (yearMatch) {
      return NextResponse.json({ data: yearMatch, requestId });
    }
  }

  const best = movies.find(m => m.title.toLowerCase() === title.toLowerCase()) ?? movies[0];
  return NextResponse.json({ data: best, requestId });
});
