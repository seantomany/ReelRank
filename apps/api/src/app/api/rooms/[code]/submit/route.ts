import { NextRequest, NextResponse } from 'next/server';
import { SubmitMovieInputSchema, ROOM_MAX_MOVIES, ABLY_EVENTS } from '@reelrank/shared';
import { authenticateRequest } from '@/lib/auth';
import { db, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { handleApiError, createRequestId, createApiError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const requestId = createRequestId();

  try {
    const { user } = await authenticateRequest(req);
    const { code } = await params;
    const body = await req.json();
    const parsed = SubmitMovieInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

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

    if (roomData.status !== 'submitting') {
      throw createApiError(400, 'Room is not accepting movie submissions', requestId);
    }

    // Check membership
    const membersSnap = await db.collection(COLLECTIONS.roomMembers(roomId)).get();
    if (!membersSnap.docs.some((m) => m.id === user.id)) {
      throw createApiError(403, 'You are not a member of this room', requestId);
    }

    // Check movie count
    const moviesSnap = await db.collection(COLLECTIONS.roomMovies(roomId)).get();
    if (moviesSnap.size >= ROOM_MAX_MOVIES) {
      throw createApiError(400, 'Maximum movies reached for this room', requestId);
    }

    // Check if movie already submitted (use movieId as doc ID)
    const movieDocId = String(parsed.data.movieId);
    const existingMovie = await db.collection(COLLECTIONS.roomMovies(roomId)).doc(movieDocId).get();
    if (existingMovie.exists) {
      return NextResponse.json(
        { error: 'Movie already submitted', requestId },
        { status: 409 },
      );
    }

    const movieData = {
      roomId,
      movieId: parsed.data.movieId,
      submittedByUserId: user.id,
      createdAt: new Date(),
    };

    await db.collection(COLLECTIONS.roomMovies(roomId)).doc(movieDocId).set(movieData);

    await publishToRoom(code, ABLY_EVENTS.MOVIE_SUBMITTED, {
      movieId: parsed.data.movieId,
      submittedBy: user.displayName,
    });

    return NextResponse.json({ data: { id: movieDocId, ...movieData }, requestId }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
