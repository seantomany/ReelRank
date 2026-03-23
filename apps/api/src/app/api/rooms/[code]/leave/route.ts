import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { findRoomByCode, verifyRoomMembership, validateRoomCode } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { ABLY_EVENTS } from '@reelrank/shared';
import { FieldValue } from 'firebase-admin/firestore';

export const POST = withAuthAndRateLimit('general', async (_req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const { roomId, room } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);

  await Promise.all([
    roomRef.collection('members').doc(user.id).delete(),
    roomRef.update({
      memberUserIds: FieldValue.arrayRemove(user.id),
      updatedAt: new Date(),
    }),
  ]);

  if (room.hostId === user.id) {
    const remainingMembers = await roomRef.collection('members').limit(1).get();
    if (remainingMembers.empty) {
      await roomRef.update({ status: 'results', updatedAt: new Date() });
    } else {
      const newHostId = remainingMembers.docs[0].id;
      await roomRef.update({ hostId: newHostId, updatedAt: new Date() });
    }
  }

  await publishToRoom(room.code, ABLY_EVENTS.MEMBER_LEFT, {
    userId: user.id,
  });

  return NextResponse.json({
    data: { left: true },
    requestId,
  });
});
