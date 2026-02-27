import { NextRequest, NextResponse } from 'next/server';
import { StartRoomInputSchema, ABLY_EVENTS } from '@reelrank/shared';
import { authenticateRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
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

    if (roomData.hostId !== user.id) {
      throw createApiError(403, 'Only the host can change room phase', requestId);
    }

    const allowed = VALID_TRANSITIONS[roomData.status];
    if (!allowed?.includes(parsed.data.phase)) {
      throw createApiError(
        400,
        `Cannot transition from ${roomData.status} to ${parsed.data.phase}`,
        requestId,
      );
    }

    // Update room status
    await getDb().collection(COLLECTIONS.rooms).doc(roomId).update({
      status: parsed.data.phase,
      updatedAt: new Date(),
    });

    // Fetch updated room with members and movies
    const membersSnap = await getDb().collection(COLLECTIONS.roomMembers(roomId)).get();
    const members = await Promise.all(
      membersSnap.docs.map(async (m) => {
        const memberData = m.data();
        const userSnap = await getDb().collection(COLLECTIONS.users).doc(memberData.userId).get();
        const userData = userSnap.data();
        return {
          id: m.id,
          roomId,
          userId: memberData.userId,
          user: userData
            ? { id: userSnap.id, displayName: userData.displayName ?? null, photoUrl: userData.photoUrl ?? null }
            : undefined,
          joinedAt: memberData.joinedAt?.toDate?.() ?? memberData.joinedAt,
        };
      }),
    );

    const moviesSnap = await getDb().collection(COLLECTIONS.roomMovies(roomId)).get();
    const movies = moviesSnap.docs.map((m) => ({
      id: m.id,
      roomId,
      ...m.data(),
      createdAt: m.data().createdAt?.toDate?.() ?? m.data().createdAt,
    }));

    const updated = {
      id: roomId,
      ...roomData,
      status: parsed.data.phase,
      updatedAt: new Date(),
      members,
      movies,
    };

    await publishToRoom(code, ABLY_EVENTS.ROOM_STATUS_CHANGED, {
      status: parsed.data.phase,
    });

    return NextResponse.json({ data: updated, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
