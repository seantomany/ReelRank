import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody, findRoomByCode, verifyRoomMembership, validateRoomCode } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { RoomSwipeInputSchema, ABLY_EVENTS } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';
import { FieldValue } from 'firebase-admin/firestore';
import { computeAndStoreResults } from './compute-results';

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

  const { movieId, direction, superlike } = parsed.data;
  const swipeDocId = `${user.id}_${movieId}`;
  const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);
  const now = new Date();

  const existingSwipe = await roomRef.collection('swipes').doc(swipeDocId).get();
  if (existingSwipe.exists) {
    throw new ApiError(400, 'Already swiped on this movie', requestId);
  }

  if (superlike) {
    const existingSuperlike = await roomRef
      .collection('swipes')
      .where('userId', '==', user.id)
      .where('superlike', '==', true)
      .limit(1)
      .get();

    if (!existingSuperlike.empty) {
      throw new ApiError(400, 'You have already used your superlike', requestId);
    }
  }

  await Promise.all([
    roomRef.collection('swipes').doc(swipeDocId).set({
      id: swipeDocId,
      roomId,
      userId: user.id,
      movieId,
      direction: superlike ? 'right' : direction,
      superlike: superlike ?? false,
      createdAt: now,
    }),
    roomRef.update({
      swipeCount: FieldValue.increment(1),
      updatedAt: now,
    }),
  ]);

  const [membersSnap, moviesCount] = await Promise.all([
    roomRef.collection('members').get(),
    roomRef.collection('movies').count().get(),
  ]);

  const totalMovies = moviesCount.data().count;
  const totalMembers = membersSnap.size;
  const totalExpected = totalMembers * totalMovies;
  const currentCount = (room.swipeCount ?? 0) + 1;
  const progress = totalExpected > 0 ? currentCount / totalExpected : 0;

  const userSwipeCount = await roomRef
    .collection('swipes')
    .where('userId', '==', user.id)
    .count()
    .get();

  const userDone = userSwipeCount.data().count >= totalMovies;

  if (userDone) {
    await roomRef.collection('members').doc(user.id).update({
      doneAt: now,
    });

    await publishToRoom(room.code, ABLY_EVENTS.MEMBER_DONE, {
      userId: user.id,
    });
  }

  await publishToRoom(room.code, ABLY_EVENTS.SWIPE_PROGRESS, {
    progress: Math.min(progress, 1),
    swipeCount: currentCount,
    totalExpected,
  });

  const allDone = userDone && currentCount >= totalExpected;

  if (allDone) {
    await computeAndStoreResults(roomId, room, roomRef);
  }

  return NextResponse.json({
    data: {
      movieId,
      direction: superlike ? 'right' : direction,
      superlike: superlike ?? false,
      progress: Math.min(progress, 1),
      userDone,
      allDone,
    },
    requestId,
  });
});
