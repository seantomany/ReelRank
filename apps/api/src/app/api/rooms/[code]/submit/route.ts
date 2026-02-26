import { NextRequest, NextResponse } from 'next/server';
import { SubmitMovieInputSchema, ROOM_MAX_MOVIES, ABLY_EVENTS } from '@reelrank/shared';
import { authenticateRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    const room = await prisma.room.findUnique({
      where: { code },
      include: { members: true, movies: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found', requestId }, { status: 404 });
    }

    if (room.status !== 'submitting') {
      throw createApiError(400, 'Room is not accepting movie submissions', requestId);
    }

    if (!room.members.some((m) => m.userId === user.id)) {
      throw createApiError(403, 'You are not a member of this room', requestId);
    }

    if (room.movies.length >= ROOM_MAX_MOVIES) {
      throw createApiError(400, 'Maximum movies reached for this room', requestId);
    }

    const existing = room.movies.find((m) => m.movieId === parsed.data.movieId);
    if (existing) {
      return NextResponse.json(
        { error: 'Movie already submitted', requestId },
        { status: 409 },
      );
    }

    const roomMovie = await prisma.roomMovie.create({
      data: {
        roomId: room.id,
        movieId: parsed.data.movieId,
        submittedByUserId: user.id,
      },
    });

    await publishToRoom(code, ABLY_EVENTS.MOVIE_SUBMITTED, {
      movieId: parsed.data.movieId,
      submittedBy: user.displayName,
    });

    return NextResponse.json({ data: roomMovie, requestId }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
