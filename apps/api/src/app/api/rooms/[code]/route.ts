import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { findRoomByCode, verifyRoomMembership, validateRoomCode } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { safeGetMovieById } from '@/lib/tmdb';

export const GET = withAuthAndRateLimit('general', async (_req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const { roomId, room } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);

  const [membersSnap, moviesSnap] = await Promise.all([
    roomRef.collection('members').get(),
    roomRef.collection('movies').get(),
  ]);

  const userRefs = membersSnap.docs
    .map((d) => getDb().collection(COLLECTIONS.users).doc(d.data().userId));

  const userDocs = userRefs.length > 0 ? await getDb().getAll(...userRefs) : [];
  const userMap = new Map(
    userDocs.filter((d) => d.exists).map((d) => [d.id, d.data()])
  );

  const members = membersSnap.docs.map((d) => {
    const data = d.data();
    const userData = userMap.get(data.userId);
    return {
      ...data,
      user: userData ? {
        id: data.userId,
        username: userData.username ?? null,
        displayName: userData.displayName ?? null,
        photoUrl: userData.photoUrl ?? null,
      } : undefined,
      joinedAt: data.joinedAt?.toDate?.()?.toISOString?.() ?? data.joinedAt,
    };
  });

  const warnings: string[] = [];
  const movies = await Promise.all(
    moviesSnap.docs.map(async (d) => {
      const data = d.data();
      const { movie, hydrated } = await safeGetMovieById(data.movieId);
      if (!hydrated) warnings.push(`Movie ${data.movieId} could not be loaded`);
      return {
        ...data,
        movie,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
      };
    })
  );

  return NextResponse.json({
    data: {
      id: roomId,
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      algorithmVersion: room.algorithmVersion,
      createdAt: room.createdAt?.toDate?.()?.toISOString?.() ?? room.createdAt,
      updatedAt: room.updatedAt?.toDate?.()?.toISOString?.() ?? room.updatedAt,
      members,
      movies,
    },
    ...(warnings.length > 0 ? { warnings } : {}),
    requestId,
  });
});
