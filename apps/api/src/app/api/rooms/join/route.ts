import { NextRequest, NextResponse } from 'next/server';
import { JoinRoomInputSchema, ROOM_MAX_MEMBERS, ABLY_EVENTS } from '@reelrank/shared';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { withRateLimit } from '@/lib/rate-limit';
import { publishToRoom } from '@/lib/ably';
import { handleApiError } from '@/lib/errors';

const ROOM_INCLUDE = {
  members: {
    include: { user: { select: { id: true, displayName: true, photoUrl: true } } },
  },
} as const;

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

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: true },
    });

    if (!room || room.status !== 'lobby') {
      return NextResponse.json(
        { error: 'Room is not accepting new members', requestId },
        { status: 400 },
      );
    }

    if (room.members.length >= ROOM_MAX_MEMBERS) {
      return NextResponse.json({ error: 'Room is full', requestId }, { status: 400 });
    }

    const alreadyJoined = room.members.some((m) => m.userId === user.id);
    if (!alreadyJoined) {
      await prisma.roomMember.create({
        data: { roomId: room.id, userId: user.id },
      });

      await publishToRoom(room.code, ABLY_EVENTS.MEMBER_JOINED, {
        userId: user.id,
        displayName: user.displayName,
      });
    }

    const updatedRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: ROOM_INCLUDE,
    });

    return NextResponse.json({ data: updatedRoom, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
