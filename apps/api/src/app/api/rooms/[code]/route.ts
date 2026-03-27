import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { findRoomByCode, verifyRoomMembership, validateRoomCode } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { safeGetMovieById } from '@/lib/tmdb';
import { FieldValue } from 'firebase-admin/firestore';

export const GET = withAuthAndRateLimit('general', async (_req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const { roomId, room } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);

  const [membersSnap, moviesSnap, swipesSnap] = await Promise.all([
    roomRef.collection('members').get(),
    roomRef.collection('movies').get(),
    room.status === 'swiping' || room.status === 'results'
      ? roomRef.collection('swipes').get()
      : Promise.resolve(null),
  ]);

  const totalMovies = moviesSnap.size;

  const swipeCountsByUser: Record<string, number> = {};
  if (swipesSnap) {
    for (const doc of swipesSnap.docs) {
      const uid = doc.data().userId as string;
      swipeCountsByUser[uid] = (swipeCountsByUser[uid] ?? 0) + 1;
    }
  }

  const userRefs = membersSnap.docs
    .map((d) => getDb().collection(COLLECTIONS.users).doc(d.data().userId));

  const userDocs = userRefs.length > 0 ? await getDb().getAll(...userRefs) : [];
  const userMap = new Map(
    userDocs.filter((d) => d.exists).map((d) => [d.id, d.data()])
  );

  const members = membersSnap.docs.map((d) => {
    const data = d.data();
    const userData = userMap.get(data.userId);
    const swiped = swipeCountsByUser[data.userId] ?? 0;
    return {
      userId: data.userId,
      user: userData ? {
        id: data.userId,
        username: userData.username ?? null,
        displayName: userData.displayName ?? null,
        photoUrl: userData.photoUrl ?? null,
      } : undefined,
      joinedAt: data.joinedAt?.toDate?.()?.toISOString?.() ?? null,
      swipeCount: swiped,
      doneAt: swiped >= totalMovies && totalMovies > 0
        ? (data.doneAt?.toDate?.()?.toISOString?.() ?? true)
        : null,
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
      name: room.name ?? null,
      hostId: room.hostId,
      status: room.status,
      algorithmVersion: room.algorithmVersion,
      ...(room.maxMoviesPerMember ? { maxMoviesPerMember: room.maxMoviesPerMember } : {}),
      createdAt: room.createdAt?.toDate?.()?.toISOString?.() ?? room.createdAt,
      updatedAt: room.updatedAt?.toDate?.()?.toISOString?.() ?? room.updatedAt,
      members,
      movies,
    },
    ...(warnings.length > 0 ? { warnings } : {}),
    requestId,
  });
});

export const PATCH = withAuthAndRateLimit('general', async (req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const { roomId } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  const body = await req.json();
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : null;

  await getDb().collection(COLLECTIONS.rooms).doc(roomId).update({
    name: name || FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ data: { name }, requestId });
});
