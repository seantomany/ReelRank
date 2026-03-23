import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody, findRoomByCode, verifyRoomMembership, validateRoomCode } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { StartRoomInputSchema, ABLY_EVENTS } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';

export const POST = withAuthAndRateLimit('general', async (req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = StartRoomInputSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { roomId, room } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  if (room.hostId !== user.id) {
    throw new ApiError(403, 'Only the host can change room phase', requestId);
  }

  const { phase } = parsed.data;
  const validTransitions: Record<string, string[]> = {
    lobby: ['submitting'],
    submitting: ['swiping'],
  };

  const allowed = validTransitions[room.status] ?? [];
  if (!allowed.includes(phase)) {
    throw new ApiError(400, `Cannot transition from "${room.status}" to "${phase}"`, requestId);
  }

  if (phase === 'swiping') {
    const moviesSnap = await getDb()
      .collection(COLLECTIONS.rooms)
      .doc(roomId)
      .collection('movies')
      .count()
      .get();

    if (moviesSnap.data().count < 2) {
      throw new ApiError(400, 'Need at least 2 movies to start swiping', requestId);
    }
  }

  const now = new Date();
  await getDb().collection(COLLECTIONS.rooms).doc(roomId).update({
    status: phase,
    updatedAt: now,
  });

  await publishToRoom(room.code, ABLY_EVENTS.ROOM_STATUS, { status: phase });

  return NextResponse.json({
    data: { status: phase },
    requestId,
  });
});
