import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { ApiError } from '@/lib/errors';

export const POST = withAuth(async (req: NextRequest, { user, requestId }) => {
  const body = await req.json().catch(() => null);
  const roomCode = body?.roomCode;
  if (!roomCode) throw new ApiError(400, 'roomCode is required', requestId);

  const userDoc = getDb().collection(COLLECTIONS.users).doc(user.id);
  const snap = await userDoc.get();
  const pinnedRooms: string[] = snap.exists ? (snap.data()?.pinnedRooms ?? []) : [];

  if (!pinnedRooms.includes(roomCode)) {
    pinnedRooms.unshift(roomCode);
    await userDoc.set({ pinnedRooms }, { merge: true });
  }

  return NextResponse.json({ data: { pinnedRooms }, requestId });
});

export const DELETE = withAuth(async (req: NextRequest, { user, requestId }) => {
  const body = await req.json().catch(() => null);
  const roomCode = body?.roomCode;
  if (!roomCode) throw new ApiError(400, 'roomCode is required', requestId);

  const userDoc = getDb().collection(COLLECTIONS.users).doc(user.id);
  const snap = await userDoc.get();
  let pinnedRooms: string[] = snap.exists ? (snap.data()?.pinnedRooms ?? []) : [];
  pinnedRooms = pinnedRooms.filter((c) => c !== roomCode);
  await userDoc.set({ pinnedRooms }, { merge: true });

  return NextResponse.json({ data: { pinnedRooms }, requestId });
});
