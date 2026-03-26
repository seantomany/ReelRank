import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';

export const GET = withAuth(async (_req: NextRequest, { user, requestId }) => {
  try {
    const snap = await getDb()
      .collection(COLLECTIONS.friendships)
      .where('userIds', 'array-contains', user.id)
      .get();

    const friends = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      const friendId = (data.userIds as string[]).find((id) => id !== user.id);
      if (!friendId) continue;

      const friendDoc = await getDb().collection(COLLECTIONS.users).doc(friendId).get();
      const fd = friendDoc.data();
      if (!fd) continue;

      friends.push({
        friendshipId: doc.id,
        userId: friendId,
        displayName: fd.displayName ?? fd.username ?? fd.email?.split('@')[0] ?? 'Unknown',
        username: fd.username ?? null,
        photoUrl: fd.photoUrl ?? null,
      });
    }

    return NextResponse.json({ data: friends, requestId });
  } catch (error) {
    console.error('Failed to fetch friends:', error);
    return NextResponse.json({ data: [], requestId });
  }
});
