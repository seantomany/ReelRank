import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { safeGetMovieById } from '@/lib/tmdb';

export const GET = withAuth(async (_req, { user, requestId }) => {
  const snapshot = await getDb()
    .collection(COLLECTIONS.rooms)
    .where('memberUserIds', 'array-contains', user.id)
    .get();

  const rooms = snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.() ?? new Date(data.createdAt ?? 0);
    return {
      id: doc.id,
      code: data.code,
      name: data.name ?? undefined,
      hostId: data.hostId,
      status: data.status,
      algorithmVersion: data.algorithmVersion,
      memberCount: data.memberUserIds?.length ?? 0,
      createdAt: createdAt.toISOString(),
      _ts: createdAt.getTime(),
    };
  });

  rooms.sort((a, b) => b._ts - a._ts);
  const recent = rooms.slice(0, 20);

  const enriched = await Promise.all(
    recent.map(async ({ _ts, ...rest }) => {
      if (rest.status === 'results') {
        const resultsSnap = await getDb()
          .collection(COLLECTIONS.rooms)
          .doc(rest.id)
          .collection('results')
          .orderBy('computedAt', 'desc')
          .limit(1)
          .get();

        if (!resultsSnap.empty) {
          const resultData = resultsSnap.docs[0].data();
          const ranked = resultData.rankedMovies;
          if (ranked && ranked.length > 0) {
            const winnerId = ranked[0].movieId;
            const { movie } = await safeGetMovieById(winnerId);
            return { ...rest, winnerMovie: movie };
          }
        }
      }
      return rest;
    })
  );

  return NextResponse.json({ data: enriched, requestId });
});
