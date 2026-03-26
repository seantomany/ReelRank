import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';

export const GET = withAuth(async (req: NextRequest, { user, requestId }) => {
  const movieId = Number(req.nextUrl.searchParams.get('movieId'));
  if (!movieId) {
    return NextResponse.json({ data: [], requestId });
  }

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
    const batches = [];
    for (let i = 0; i < friendIds.length; i += batchSize) {
      batches.push(friendIds.slice(i, i + batchSize));
    }

    const friendWatches: any[] = [];
    for (const batch of batches) {
      const snap = await getDb()
        .collection(COLLECTIONS.watchedMovies)
        .where('userId', 'in', batch)
        .where('movieId', '==', movieId)
        .get();

      for (const doc of snap.docs) {
        const d = doc.data();
        friendWatches.push({
          userId: d.userId,
          rating: d.rating ?? null,
          venue: d.venue ?? null,
          watchedAt: d.watchedAt ?? d.createdAt ?? null,
        });
      }
    }

    const userIds = [...new Set(friendWatches.map((w) => w.userId))];
    const userDocs = await Promise.all(
      userIds.map((uid) => getDb().collection(COLLECTIONS.users).doc(uid).get())
    );
    const userMap = new Map<string, any>();
    for (const ud of userDocs) {
      if (ud.exists) {
        const d = ud.data()!;
        userMap.set(ud.id, {
          displayName: d.displayName ?? d.username ?? d.email?.split('@')[0] ?? 'Unknown',
          photoUrl: d.photoUrl ?? null,
        });
      }
    }

    const result = friendWatches.map((w) => ({
      ...w,
      displayName: userMap.get(w.userId)?.displayName ?? 'Unknown',
      photoUrl: userMap.get(w.userId)?.photoUrl ?? null,
    }));

    return NextResponse.json({ data: result, requestId });
  } catch (error) {
    console.error('Failed to fetch friend movie data:', error);
    return NextResponse.json({ data: [], requestId });
  }
});
