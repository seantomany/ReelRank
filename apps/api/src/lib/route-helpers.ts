import { NextRequest } from 'next/server';
import { ApiError } from './errors';
import { getDb, COLLECTIONS } from './firestore';
import { RoomCodeSchema } from '@reelrank/shared';

export async function parseJsonBody<T>(
  req: NextRequest,
  requestId: string
): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, 'Invalid JSON body', requestId);
  }
}

export function validateRoomCode(code: string, requestId: string): string {
  const result = RoomCodeSchema.safeParse(code.toUpperCase());
  if (!result.success) {
    throw new ApiError(400, 'Invalid room code format', requestId);
  }
  return result.data;
}

export async function findRoomByCode(
  code: string,
  requestId: string
): Promise<{ roomId: string; room: FirebaseFirestore.DocumentData }> {
  const snapshot = await getDb()
    .collection(COLLECTIONS.rooms)
    .where('code', '==', code)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new ApiError(404, 'Room not found', requestId);
  }

  const doc = snapshot.docs[0];
  return { roomId: doc.id, room: doc.data() };
}

export async function verifyRoomMembership(
  roomId: string,
  userId: string,
  requestId: string
): Promise<void> {
  const memberDoc = await getDb()
    .collection(COLLECTIONS.rooms)
    .doc(roomId)
    .collection('members')
    .doc(userId)
    .get();

  if (!memberDoc.exists) {
    throw new ApiError(403, 'You are not a member of this room', requestId);
  }
}
