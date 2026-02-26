import { NextRequest, NextResponse } from 'next/server';
import { RoomSwipeInputSchema, ABLY_EVENTS } from '@reelrank/shared';
import { authenticateRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publishToRoom } from '@/lib/ably';
import { handleApiError, createRequestId, createApiError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const requestId = createRequestId();

  try {
    const { user } = await authenticateRequest(req);
    const { code } = await params;
    const body = await req.json();
    const parsed = RoomSwipeInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: { members: true, movies: true, swipes: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found', requestId }, { status: 404 });
    }

    if (room.status !== 'swiping') {
      throw createApiError(400, 'Room is not in swiping phase', requestId);
    }

    if (!room.members.some((m) => m.userId === user.id)) {
      throw createApiError(403, 'You are not a member of this room', requestId);
    }

    const swipe = await prisma.roomSwipe.upsert({
      where: {
        roomId_userId_movieId: {
          roomId: room.id,
          userId: user.id,
          movieId: parsed.data.movieId,
        },
      },
      update: { direction: parsed.data.direction },
      create: {
        roomId: room.id,
        userId: user.id,
        movieId: parsed.data.movieId,
        direction: parsed.data.direction,
      },
    });

    const totalExpected = room.members.length * room.movies.length;
    const totalSwipes = room.swipes.length + 1;
    const progress = Math.min(totalSwipes / totalExpected, 1);

    await publishToRoom(code, ABLY_EVENTS.SWIPE_PROGRESS, {
      userId: user.id,
      progress,
      totalSwipes,
      totalExpected,
    });

    return NextResponse.json({ data: { swipe, progress }, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
