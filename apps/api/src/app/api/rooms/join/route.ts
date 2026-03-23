import { NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody, findRoomByCode } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { JoinRoomInputSchema, ROOM_MAX_MEMBERS, ABLY_EVENTS } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';
import { FieldValue } from 'firebase-admin/firestore';

export const POST = withAuthAndRateLimit('roomJoin', async (req, { user, requestId }) => {
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = JoinRoomInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { roomId, room } = await findRoomByCode(parsed.data.code, requestId);

  if (room.status !== 'lobby') {
    throw new ApiError(400, 'Room is no longer accepting new members', requestId);
  }

  const memberDoc = await getDb()
    .collection(COLLECTIONS.rooms)
    .doc(roomId)
    .collection('members')
    .doc(user.id)
    .get();

  if (memberDoc.exists) {
    return NextResponse.json({
      data: { roomId, code: room.code, status: room.status, alreadyJoined: true },
      requestId,
    });
  }

  const membersSnap = await getDb()
    .collection(COLLECTIONS.rooms)
    .doc(roomId)
    .collection('members')
    .count()
    .get();

  if (membersSnap.data().count >= ROOM_MAX_MEMBERS) {
    throw new ApiError(400, `Room is full (max ${ROOM_MAX_MEMBERS} members)`, requestId);
  }

  const now = new Date();
  const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);

  await Promise.all([
    roomRef.collection('members').doc(user.id).set({
      id: user.id,
      roomId,
      userId: user.id,
      joinedAt: now,
    }),
    roomRef.update({
      memberUserIds: FieldValue.arrayUnion(user.id),
      updatedAt: now,
    }),
  ]);

  await publishToRoom(room.code, ABLY_EVENTS.MEMBER_JOINED, {
    userId: user.id,
    displayName: user.displayName,
  });

  return NextResponse.json({
    data: { roomId, code: room.code, status: room.status },
    requestId,
  });
});
