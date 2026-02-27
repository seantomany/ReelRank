import { NextRequest, NextResponse } from 'next/server';
import { JoinRoomInputSchema, ROOM_MAX_MEMBERS, ABLY_EVENTS } from '@reelrank/shared';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { db, COLLECTIONS } from '@/lib/firestore';
import { redis } from '@/lib/redis';
import { withRateLimit } from '@/lib/rate-limit';
import { publishToRoom } from '@/lib/ably';
import { handleApiError } from '@/lib/errors';

async function getRoomWithMembers(roomId: string) {
  const roomSnap = await db.collection(COLLECTIONS.rooms).doc(roomId).get();
  if (!roomSnap.exists) return null;

  const roomData = roomSnap.data()!;
  const membersSnap = await db.collection(COLLECTIONS.roomMembers(roomId)).get();

  // Fetch user details for each member
  const members = await Promise.all(
    membersSnap.docs.map(async (m) => {
      const memberData = m.data();
      const userSnap = await db.collection(COLLECTIONS.users).doc(memberData.userId).get();
      const userData = userSnap.data();
      return {
        id: m.id,
        roomId,
        userId: memberData.userId,
        user: userData
          ? { id: userSnap.id, displayName: userData.displayName ?? null, photoUrl: userData.photoUrl ?? null }
          : undefined,
        joinedAt: memberData.joinedAt?.toDate?.() ?? memberData.joinedAt,
      };
    }),
  );

  return {
    id: roomId,
    ...roomData,
    createdAt: roomData.createdAt?.toDate?.() ?? roomData.createdAt,
    updatedAt: roomData.updatedAt?.toDate?.() ?? roomData.updatedAt,
    members,
  };
}

export const POST = withAuth(async (req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const rateLimited = await withRateLimit(req, 'roomJoin');
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const parsed = JoinRoomInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

    const roomId = await redis.get<string>(`room:${parsed.data.code}`);
    if (!roomId) {
      return NextResponse.json({ error: 'Room not found', requestId }, { status: 404 });
    }

    const roomSnap = await db.collection(COLLECTIONS.rooms).doc(roomId).get();
    if (!roomSnap.exists) {
      return NextResponse.json({ error: 'Room not found', requestId }, { status: 404 });
    }

    const roomData = roomSnap.data()!;
    if (roomData.status !== 'lobby') {
      return NextResponse.json(
        { error: 'Room is not accepting new members', requestId },
        { status: 400 },
      );
    }

    const membersSnap = await db.collection(COLLECTIONS.roomMembers(roomId)).get();
    if (membersSnap.size >= ROOM_MAX_MEMBERS) {
      return NextResponse.json({ error: 'Room is full', requestId }, { status: 400 });
    }

    const alreadyJoined = membersSnap.docs.some((m) => m.id === user.id);
    if (!alreadyJoined) {
      await db.collection(COLLECTIONS.roomMembers(roomId)).doc(user.id).set({
        userId: user.id,
        joinedAt: new Date(),
      });

      await publishToRoom(roomData.code, ABLY_EVENTS.MEMBER_JOINED, {
        userId: user.id,
        displayName: user.displayName,
      });
    }

    const updatedRoom = await getRoomWithMembers(roomId);
    return NextResponse.json({ data: updatedRoom, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
