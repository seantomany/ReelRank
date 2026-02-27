import { NextRequest, NextResponse } from 'next/server';
import { ROOM_CODE_LENGTH } from '@reelrank/shared';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { redis } from '@/lib/redis';
import { handleApiError } from '@/lib/errors';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const POST = withAuth(async (_req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    let code = '';
    let attempts = 0;

    do {
      code = generateRoomCode();
      const existing = await redis.get(`room:${code}`);
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Failed to generate unique room code', requestId },
        { status: 500 },
      );
    }

    const now = new Date();
    const roomData = {
      code,
      hostId: user.id,
      status: 'lobby',
      createdAt: now,
      updatedAt: now,
    };

    const roomRef = await getDb().collection(COLLECTIONS.rooms).add(roomData);
    const roomId = roomRef.id;

    // Add host as first member
    await getDb().collection(COLLECTIONS.roomMembers(roomId)).doc(user.id).set({
      userId: user.id,
      joinedAt: now,
    });

    // Cache room code → room ID in Redis
    await redis.set(`room:${code}`, roomId, { ex: 86400 });

    const room = {
      id: roomId,
      ...roomData,
      members: [
        {
          id: user.id,
          roomId,
          userId: user.id,
          user: { id: user.id, displayName: user.displayName, photoUrl: user.photoUrl },
          joinedAt: now,
        },
      ],
    };

    return NextResponse.json({ data: room, requestId }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
