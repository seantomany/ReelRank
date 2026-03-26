import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody, findRoomByCode, verifyRoomMembership, validateRoomCode } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { SubmitMovieInputSchema, ROOM_MAX_MOVIES, ABLY_EVENTS } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';

export const DELETE = withAuthAndRateLimit('general', async (req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = SubmitMovieInputSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { roomId, room } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  if (room.status !== 'submitting') {
    throw new ApiError(400, 'Room is not accepting changes to submissions', requestId);
  }

  const movieDocId = String(parsed.data.movieId);
  const movieRef = getDb().collection(COLLECTIONS.rooms).doc(roomId).collection('movies').doc(movieDocId);
  const movieDoc = await movieRef.get();

  if (!movieDoc.exists) {
    throw new ApiError(404, 'Movie not found in room', requestId);
  }

  if (movieDoc.data()?.submittedByUserId !== user.id && room.hostId !== user.id) {
    throw new ApiError(403, 'You can only remove movies you submitted', requestId);
  }

  await movieRef.delete();

  await publishToRoom(room.code, ABLY_EVENTS.MOVIE_SUBMITTED, {
    movieId: parsed.data.movieId,
    removed: true,
    removedBy: user.id,
  });

  return NextResponse.json({
    data: { movieId: parsed.data.movieId, removed: true },
    requestId,
  });
});

export const POST = withAuthAndRateLimit('general', async (req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = SubmitMovieInputSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { roomId, room } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  if (room.status !== 'submitting') {
    throw new ApiError(400, 'Room is not accepting movie submissions', requestId);
  }

  const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);
  const moviesSnap = await roomRef.collection('movies').count().get();

  if (moviesSnap.data().count >= ROOM_MAX_MOVIES) {
    throw new ApiError(400, `Room already has maximum movies (${ROOM_MAX_MOVIES})`, requestId);
  }

  if (room.maxMoviesPerMember) {
    const userMoviesSnap = await roomRef
      .collection('movies')
      .where('submittedByUserId', '==', user.id)
      .count()
      .get();
    if (userMoviesSnap.data().count >= room.maxMoviesPerMember) {
      throw new ApiError(400, `You've reached your limit of ${room.maxMoviesPerMember} movies`, requestId);
    }
  }

  const movieDocId = String(parsed.data.movieId);
  const existingMovie = await roomRef.collection('movies').doc(movieDocId).get();
  if (existingMovie.exists) {
    throw new ApiError(400, 'Movie already submitted to this room', requestId);
  }

  const now = new Date();
  await roomRef.collection('movies').doc(movieDocId).set({
    id: movieDocId,
    roomId,
    movieId: parsed.data.movieId,
    submittedByUserId: user.id,
    createdAt: now,
  });

  await publishToRoom(room.code, ABLY_EVENTS.MOVIE_SUBMITTED, {
    movieId: parsed.data.movieId,
    submittedBy: user.id,
  });

  return NextResponse.json({
    data: { movieId: parsed.data.movieId, submitted: true },
    requestId,
  });
});
