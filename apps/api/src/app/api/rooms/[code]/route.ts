import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { handleApiError, createRequestId } from '@/lib/errors';
import { withRateLimit } from '@/lib/rate-limit';
import { validateRoomCode, findRoomByCode } from '@/lib/route-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const requestId = createRequestId();

  try {
    const rateLimited = await withRateLimit(req, 'general');
    if (rateLimited) return rateLimited;

    await authenticateRequest(req);
    const { code: rawCode } = await params;
    const code = validateRoomCode(rawCode, requestId);

    const { roomId, roomData } = await findRoomByCode(getDb(), COLLECTIONS.rooms, code, requestId);

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

    const room = {
      id: roomId,
      ...roomData,
      createdAt: roomData.createdAt?.toDate?.() ?? roomData.createdAt,
      updatedAt: roomData.updatedAt?.toDate?.() ?? roomData.updatedAt,
      members,
      movies,
    };

    return NextResponse.json({ data: room, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
