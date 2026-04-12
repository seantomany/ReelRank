import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { safeGetMovieById } from '@/lib/tmdb';

async function safeGetMovie(movieId: number) {
  try {
    const { movie, hydrated } = await safeGetMovieById(movieId);
    if (!hydrated) return null;
    return {
      id: movie.id,
      title: movie.title,
      posterPath: movie.posterPath,
      releaseDate: movie.releaseDate,
      voteAverage: movie.voteAverage,
    };
  } catch {
    return null;
  }
}

export const GET = withAuth(async (_req: NextRequest, { user, requestId }) => {
  try {
    const friendsSnap = await getDb()
      .collection(COLLECTIONS.friendships)
      .where('userIds', 'array-contains', user.id)
      .get();

    const friendIds: string[] = [];
    for (const doc of friendsSnap.docs) {
      const ids = doc.data().userIds as string[];
      const fid = ids.find((id) => id !== user.id);
      if (fid) friendIds.push(fid);
    }

    if (friendIds.length === 0) {
      return NextResponse.json({ data: [], requestId });
    }

    const batchSize = 10;
    const allWatches: any[] = [];
    for (let i = 0; i < friendIds.length; i += batchSize) {
      const batch = friendIds.slice(i, i + batchSize);
      const snap = await getDb()
        .collection(COLLECTIONS.watchedMovies)
        .where('userId', 'in', batch)
        .limit(50)
        .get();
      for (const doc of snap.docs) {
        allWatches.push({ id: doc.id, ...doc.data() });
      }
    }

    allWatches.sort((a, b) => {
      const toStr = (v: any) => {
        if (!v) return '';
        if (typeof v === 'string') return v;
        if (typeof v?.toDate === 'function') return v.toDate().toISOString();
        if (v instanceof Date) return v.toISOString();
        return String(v);
      };
      const ta = toStr(a.watchedAt) || toStr(a.createdAt);
      const tb = toStr(b.watchedAt) || toStr(b.createdAt);
      return tb.localeCompare(ta);
    });

    const feed = allWatches.slice(0, 30);

    const userDocMap = new Map<string, any>();
    const uniqueUserIds = [...new Set(feed.map((w) => w.userId))];
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        const ud = await getDb().collection(COLLECTIONS.users).doc(uid).get();
        if (ud.exists) {
          const d = ud.data()!;
          userDocMap.set(uid, {
            displayName: d.displayName ?? d.username ?? d.email?.split('@')[0] ?? 'Unknown',
            photoUrl: d.photoUrl ?? null,
          });
        }
      })
    );

    const uniqueMovieIds = [...new Set(feed.map((w) => w.movieId as number))];
    const movieMap = new Map<number, any>();
    await Promise.all(
      uniqueMovieIds.map(async (mid) => {
        const m = await safeGetMovie(mid);
        if (m) movieMap.set(mid, m);
      })
    );

    const result = feed
      .map((w) => ({
        id: w.id,
        userId: w.userId,
        movieId: w.movieId,
        rating: w.rating ?? null,
        venue: w.venue ?? null,
        watchedAt: w.watchedAt ?? w.createdAt ?? null,
        friend: userDocMap.get(w.userId) ?? { displayName: 'Unknown', photoUrl: null },
        movie: movieMap.get(w.movieId) ?? null,
      }))
      .filter((w) => w.movie);

    return NextResponse.json({ data: result, requestId });
  } catch (error) {
    console.error('Failed to fetch social feed:', error);
    return NextResponse.json({ data: [], requestId });
  }
});
