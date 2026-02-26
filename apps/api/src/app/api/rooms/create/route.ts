import { NextRequest, NextResponse } from 'next/server';
import { ROOM_CODE_LENGTH } from '@reelrank/shared';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    const room = await prisma.room.create({
      data: {
        code,
        hostId: user.id,
        status: 'lobby',
        members: { create: { userId: user.id } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, displayName: true, photoUrl: true } } },
        },
      },
    });

    await redis.set(`room:${code}`, room.id, { ex: 86400 });

    return NextResponse.json({ data: room, requestId }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
