import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { handleApiError } from '@/lib/errors';

export const GET = withAuth(async (_req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const roomsSnap = await getDb().collection(COLLECTIONS.rooms)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const rooms = [];
    for (const doc of roomsSnap.docs) {
      const data = doc.data();
      const memberSnap = await getDb().collection(COLLECTIONS.roomMembers(doc.id)).doc(user.id).get();
      if (!memberSnap.exists) continue;

      const membersSnap = await getDb().collection(COLLECTIONS.roomMembers(doc.id)).get();

      rooms.push({
        id: doc.id,
        code: data.code,
        hostId: data.hostId,
        status: data.status,
        memberCount: membersSnap.size,
        createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
      });
    }

    return NextResponse.json({ data: rooms, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
