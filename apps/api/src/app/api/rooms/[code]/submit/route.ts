import { NextRequest, NextResponse } from 'next/server';
import { SubmitMovieInputSchema, ROOM_MAX_MOVIES, ABLY_EVENTS } from '@reelrank/shared';
import { authenticateRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { handleApiError, createRequestId, createApiError } from '@/lib/errors';
import { withRateLimit } from '@/lib/rate-limit';
import { parseJsonBody, validateRoomCode, findRoomByCode } from '@/lib/route-helpers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const requestId = createRequestId();

  try {
    const rateLimited = await withRateLimit(req, 'general');
    if (rateLimited) return rateLimited;

    const { user } = await authenticateRequest(req);
    const { code: rawCode } = await params;
    const code = validateRoomCode(rawCode, requestId);

    const body = await parseJsonBody(req);
    const parsed = SubmitMovieInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

    const { roomId, roomData } = await findRoomByCode(getDb(), COLLECTIONS.rooms, code, requestId);

    if (roomData.status !== 'submitting') {
      throw createApiError(400, 'Room is not accepting movie submissions', requestId);
    }

    const membersSnap = await getDb().collection(COLLECTIONS.roomMembers(roomId)).get();
    if (!membersSnap.docs.some((m) => m.id === user.id)) {
      throw createApiError(403, 'You are not a member of this room', requestId);
    }

    const moviesSnap = await getDb().collection(COLLECTIONS.roomMovies(roomId)).get();
    if (moviesSnap.size >= ROOM_MAX_MOVIES) {
      throw createApiError(400, 'Maximum movies reached for this room', requestId);
    }

    const movieDocId = String(parsed.data.movieId);
    const existingMovie = await getDb().collection(COLLECTIONS.roomMovies(roomId)).doc(movieDocId).get();
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

    await getDb().collection(COLLECTIONS.roomMovies(roomId)).doc(movieDocId).set(movieData);

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
