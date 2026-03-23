import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';

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
      hostId: data.hostId,
      status: data.status,
      algorithmVersion: data.algorithmVersion,
      memberCount: data.memberUserIds?.length ?? 0,
      createdAt: createdAt.toISOString(),
      _ts: createdAt.getTime(),
    };
  });

  rooms.sort((a, b) => b._ts - a._ts);
  const result = rooms.slice(0, 20).map(({ _ts, ...rest }) => rest);

  return NextResponse.json({ data: result, requestId });
});
