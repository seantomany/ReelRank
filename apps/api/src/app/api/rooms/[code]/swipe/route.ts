import { NextRequest, NextResponse } from 'next/server';
import { RoomSwipeInputSchema, ABLY_EVENTS } from '@reelrank/shared';
import { authenticateRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { handleApiError, createRequestId, createApiError } from '@/lib/errors';
import { withRateLimit } from '@/lib/rate-limit';
import { parseJsonBody, validateRoomCode, findRoomByCode } from '@/lib/route-helpers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const requestId = createRequestId();

  try {
    const rateLimited = await withRateLimit(req, 'general');
    if (rateLimited) return rateLimited;

    const { user } = await authenticateRequest(req);
    const { code: rawCode } = await params;
    const code = validateRoomCode(rawCode, requestId);

    const body = await parseJsonBody(req);
    const parsed = RoomSwipeInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

    const { roomId, roomData } = await findRoomByCode(getDb(), COLLECTIONS.rooms, code, requestId);

    if (roomData.status !== 'swiping') {
      throw createApiError(400, 'Room is not in swiping phase', requestId);
    }

    const [membersSnap, moviesSnap] = await Promise.all([
      getDb().collection(COLLECTIONS.roomMembers(roomId)).get(),
      getDb().collection(COLLECTIONS.roomMovies(roomId)).get(),
    ]);

    if (!membersSnap.docs.some((m) => m.id === user.id)) {
      throw createApiError(403, 'You are not a member of this room', requestId);
    }

    const movieIds = new Set(moviesSnap.docs.map((m) => (m.data() as { movieId: number }).movieId));
    if (!movieIds.has(parsed.data.movieId)) {
      throw createApiError(400, 'Movie is not in this room\'s pool', requestId);
    }

    const swipeDocId = `${user.id}_${parsed.data.movieId}`;
    const swipeData = {
      roomId,
      userId: user.id,
      movieId: parsed.data.movieId,
      direction: parsed.data.direction,
      createdAt: new Date(),
    };

    await getDb().collection(COLLECTIONS.roomSwipes(roomId)).doc(swipeDocId).set(swipeData);

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
