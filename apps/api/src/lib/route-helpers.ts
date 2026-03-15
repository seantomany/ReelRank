import { NextRequest, NextResponse } from 'next/server';
import { RoomCodeSchema } from '@reelrank/shared';
import { createApiError, createRequestId } from './errors';

export async function parseJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw createApiError(400, 'Invalid JSON body');
  }
}

export function validateRoomCode(code: string, requestId?: string): string {
  const parsed = RoomCodeSchema.safeParse(code.toUpperCase());
  if (!parsed.success) {
    throw createApiError(400, 'Invalid room code', requestId);
  }
  return parsed.data;
}

export async function findRoomByCode(db: FirebaseFirestore.Firestore, collectionsRooms: string, code: string, requestId: string) {
  const roomsSnap = await db.collection(collectionsRooms)
    .where('code', '==', code)
    .limit(1)
    .get();

  if (roomsSnap.empty) {
    throw createApiError(404, 'Room not found', requestId);
  }

  return { roomDoc: roomsSnap.docs[0], roomId: roomsSnap.docs[0].id, roomData: roomsSnap.docs[0].data() };
}
