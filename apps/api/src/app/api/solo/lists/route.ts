import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { getMovieById } from '@/lib/tmdb';
import { handleApiError } from '@/lib/errors';

export const GET = withAuth(async (req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const listType = searchParams.get('type') ?? 'want';

    let query = getDb().collection(COLLECTIONS.soloSwipes)
      .where('userId', '==', user.id)
      .orderBy('createdAt', 'desc');

    if (listType === 'want') {
      query = getDb().collection(COLLECTIONS.soloSwipes)
        .where('userId', '==', user.id)
        .where('direction', '==', 'right')
        .orderBy('createdAt', 'desc');
    }

    const snapshot = await query.get();
    const swipes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() as { movieId: number; direction: string; createdAt: Date } }));

    const movies = await Promise.all(
      swipes.map((s) => getMovieById(s.movieId).catch(() => null)),
    );

    const results = swipes
      .map((swipe, i) => ({ ...swipe, movie: movies[i] }))
      .filter((r) => r.movie);

    return NextResponse.json({ data: results, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
