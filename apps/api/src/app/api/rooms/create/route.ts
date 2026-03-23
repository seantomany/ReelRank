import { NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { getRedis } from '@/lib/redis';
import { publishToRoom } from '@/lib/ably';
import { CreateRoomInputSchema, ROOM_CODE_LENGTH, ABLY_EVENTS } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const POST = withAuthAndRateLimit('general', async (req, { user, requestId }) => {
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = CreateRoomInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const redis = getRedis();
  const db = getDb();
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateCode();

    const cached = await redis.get(`room:${code}`);
    if (cached) continue;

    const existingRoom = await db
      .collection(COLLECTIONS.rooms)
      .where('code', '==', code)
      .where('status', 'in', ['lobby', 'submitting', 'swiping'])
      .limit(1)
      .get();
    if (!existingRoom.empty) continue;

    const now = new Date();
    const roomRef = db.collection(COLLECTIONS.rooms).doc();
    const roomData = {
      id: roomRef.id,
      code,
      hostId: user.id,
      status: 'lobby' as const,
      algorithmVersion: parsed.data.algorithmVersion,
      memberUserIds: [user.id],
      swipeCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await roomRef.set(roomData);

    await roomRef.collection('members').doc(user.id).set({
      id: user.id,
      roomId: roomRef.id,
      userId: user.id,
      joinedAt: now,
    });

    await redis.set(`room:${code}`, roomRef.id, { ex: 86400 });

    return NextResponse.json({
      data: {
        id: roomRef.id,
        code,
        status: 'lobby',
        hostId: user.id,
      },
      requestId,
    });
  }

  throw new ApiError(500, 'Failed to generate unique room code', requestId);
});
