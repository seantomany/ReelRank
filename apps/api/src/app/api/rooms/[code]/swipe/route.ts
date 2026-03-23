import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody, findRoomByCode, verifyRoomMembership, validateRoomCode } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { RoomSwipeInputSchema, ABLY_EVENTS } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';
import { FieldValue } from 'firebase-admin/firestore';

export const POST = withAuthAndRateLimit('general', async (req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = RoomSwipeInputSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { roomId, room } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  if (room.status !== 'swiping') {
    throw new ApiError(400, 'Room is not in swiping phase', requestId);
  }

  const { movieId, direction } = parsed.data;
  const swipeDocId = `${user.id}_${movieId}`;
  const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);
  const now = new Date();

  const existingSwipe = await roomRef.collection('swipes').doc(swipeDocId).get();
  if (existingSwipe.exists) {
    throw new ApiError(400, 'Already swiped on this movie', requestId);
  }

  await Promise.all([
    roomRef.collection('swipes').doc(swipeDocId).set({
      id: swipeDocId,
      roomId,
      userId: user.id,
      movieId,
      direction,
      createdAt: now,
    }),
    roomRef.update({
      swipeCount: FieldValue.increment(1),
      updatedAt: now,
    }),
  ]);

  const [membersCount, moviesCount] = await Promise.all([
    roomRef.collection('members').count().get(),
    roomRef.collection('movies').count().get(),
  ]);

  const totalExpected = membersCount.data().count * moviesCount.data().count;
  const currentCount = (room.swipeCount ?? 0) + 1;
  const progress = totalExpected > 0 ? currentCount / totalExpected : 0;

  await publishToRoom(room.code, ABLY_EVENTS.SWIPE_PROGRESS, {
    progress: Math.min(progress, 1),
    swipeCount: currentCount,
    totalExpected,
  });

  return NextResponse.json({
    data: { movieId, direction, progress: Math.min(progress, 1) },
    requestId,
  });
});
