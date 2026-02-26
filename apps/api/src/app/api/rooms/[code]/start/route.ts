import { NextRequest, NextResponse } from 'next/server';
import { StartRoomInputSchema, ABLY_EVENTS } from '@reelrank/shared';
import { authenticateRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publishToRoom } from '@/lib/ably';
import { handleApiError, createRequestId, createApiError } from '@/lib/errors';
import type { RoomStatus } from '@reelrank/shared';

const VALID_TRANSITIONS: Record<string, RoomStatus[]> = {
  lobby: ['submitting'],
  submitting: ['swiping'],
  swiping: ['results'],
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const requestId = createRequestId();

  try {
    const { user } = await authenticateRequest(req);
    const { code } = await params;
    const body = await req.json();
    const parsed = StartRoomInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

    const room = await prisma.room.findUnique({ where: { code } });

    if (!room) {
      return NextResponse.json({ error: 'Room not found', requestId }, { status: 404 });
    }

    if (room.hostId !== user.id) {
      throw createApiError(403, 'Only the host can change room phase', requestId);
    }

    const allowed = VALID_TRANSITIONS[room.status];
    if (!allowed?.includes(parsed.data.phase)) {
      throw createApiError(
        400,
        `Cannot transition from ${room.status} to ${parsed.data.phase}`,
        requestId,
      );
    }

    const updated = await prisma.room.update({
      where: { code },
      data: { status: parsed.data.phase },
      include: {
        members: {
          include: { user: { select: { id: true, displayName: true, photoUrl: true } } },
        },
        movies: true,
      },
    });

    await publishToRoom(code, ABLY_EVENTS.ROOM_STATUS_CHANGED, {
      status: parsed.data.phase,
    });

    return NextResponse.json({ data: updated, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
