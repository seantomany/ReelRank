import { NextRequest, NextResponse } from 'next/server';
import { RoomSwipeInputSchema, ABLY_EVENTS } from '@reelrank/shared';
import { authenticateRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
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

    // Find room by code
    const roomsSnap = await getDb().collection(COLLECTIONS.rooms)
      .where('code', '==', code)
      .limit(1)
      .get();

    if (roomsSnap.empty) {
      return NextResponse.json({ error: 'Room not found', requestId }, { status: 404 });
    }

    const roomDoc = roomsSnap.docs[0];
    const roomId = roomDoc.id;
    const roomData = roomDoc.data();

    if (roomData.status !== 'swiping') {
      throw createApiError(400, 'Room is not in swiping phase', requestId);
    }

    // Check membership
    const membersSnap = await getDb().collection(COLLECTIONS.roomMembers(roomId)).get();
    if (!membersSnap.docs.some((m) => m.id === user.id)) {
      throw createApiError(403, 'You are not a member of this room', requestId);
    }

    // Upsert swipe using deterministic doc ID
    const swipeDocId = `${user.id}_${parsed.data.movieId}`;
    const swipeData = {
      roomId,
      userId: user.id,
      movieId: parsed.data.movieId,
      direction: parsed.data.direction,
      createdAt: new Date(),
    };

    await getDb().collection(COLLECTIONS.roomSwipes(roomId)).doc(swipeDocId).set(swipeData);

    // Calculate progress
    const moviesSnap = await getDb().collection(COLLECTIONS.roomMovies(roomId)).get();
    const swipesSnap = await getDb().collection(COLLECTIONS.roomSwipes(roomId)).get();
    const totalExpected = membersSnap.size * moviesSnap.size;
    const totalSwipes = swipesSnap.size;
    const progress = Math.min(totalSwipes / totalExpected, 1);

    await publishToRoom(code, ABLY_EVENTS.SWIPE_PROGRESS, {
      userId: user.id,
      progress,
      totalSwipes,
      totalExpected,
    });

    return NextResponse.json({ data: { swipe: { id: swipeDocId, ...swipeData }, progress }, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
