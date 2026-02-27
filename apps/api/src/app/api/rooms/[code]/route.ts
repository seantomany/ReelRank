import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { db, COLLECTIONS } from '@/lib/firestore';
import { handleApiError, createRequestId } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const requestId = createRequestId();

  try {
    await authenticateRequest(req);
    const { code } = await params;

    // Find room by code
    const roomsSnap = await db.collection(COLLECTIONS.rooms)
      .where('code', '==', code)
      .limit(1)
      .get();

    if (roomsSnap.empty) {
      return NextResponse.json({ error: 'Room not found', requestId }, { status: 404 });
    }

    const roomDoc = roomsSnap.docs[0];
    const roomId = roomDoc.id;
    const roomData = roomDoc.data();

    // Fetch members with user details
    const membersSnap = await db.collection(COLLECTIONS.roomMembers(roomId)).get();
    const members = await Promise.all(
      membersSnap.docs.map(async (m) => {
        const memberData = m.data();
        const userSnap = await db.collection(COLLECTIONS.users).doc(memberData.userId).get();
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

    // Fetch movies
    const moviesSnap = await db.collection(COLLECTIONS.roomMovies(roomId)).get();
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
