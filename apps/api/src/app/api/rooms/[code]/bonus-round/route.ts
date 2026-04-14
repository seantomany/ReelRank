import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { findRoomByCode, verifyRoomMembership, validateRoomCode, parseJsonBody } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { safeGetMovieById } from '@/lib/tmdb';
import { ABLY_EVENTS } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';
import { z } from 'zod';

const BonusRoundInputSchema = z.object({
  movieIds: z.array(z.number().int().positive()).min(2).max(10),
});

const BonusVoteInputSchema = z.object({
  movieId: z.number().int().positive(),
});

export const GET = withAuthAndRateLimit('general', async (_req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const { roomId } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);
  const activeSnap = await roomRef
    .collection('bonusRounds')
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!activeSnap.empty) {
    const doc = activeSnap.docs[0];
    const data = doc.data();
    const movieIds: number[] = data.movieIds ?? [];
    const movieResults = await Promise.all(movieIds.map((id) => safeGetMovieById(id)));
    const movies = movieResults.map(({ movie }) => movie);
    return NextResponse.json({
      data: {
        bonusRoundId: doc.id,
        status: 'active',
        movieIds,
        movies,
        votes: data.votes ?? {},
      },
      requestId,
    });
  }

  // Fall back to most recently completed bonus round, if any
  const completedSnap = await roomRef
    .collection('bonusRounds')
    .where('status', '==', 'completed')
    .limit(1)
    .get();

  if (!completedSnap.empty) {
    const doc = completedSnap.docs[0];
    const data = doc.data();
    const winnerId = data.winnerId as number | undefined;
    const { movie } = winnerId ? await safeGetMovieById(winnerId) : { movie: null };
    return NextResponse.json({
      data: {
        bonusRoundId: doc.id,
        status: 'completed',
        winnerId: winnerId ?? null,
        movie,
      },
      requestId,
    });
  }

  return NextResponse.json({ data: null, requestId });
});

export const POST = withAuthAndRateLimit('general', async (req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const { roomId, room } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  const body = await parseJsonBody<unknown>(req, requestId);

  // If body has movieIds, this is creating a bonus round (host only)
  const createParsed = BonusRoundInputSchema.safeParse(body);
  if (createParsed.success) {
    if (room.hostId !== user.id) {
      throw new ApiError(403, 'Only the host can start a bonus round', requestId);
    }

    const { movieIds } = createParsed.data;
    const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);

    const bonusRef = roomRef.collection('bonusRounds').doc();
    const now = new Date();
    await bonusRef.set({
      id: bonusRef.id,
      movieIds,
      votes: {},
      createdAt: now,
      status: 'active',
    });

    const movieResults = await Promise.all(movieIds.map((id) => safeGetMovieById(id)));
    const movies = movieResults.map(({ movie }) => movie);

    await publishToRoom(room.code, ABLY_EVENTS.BONUS_STARTED, {
      bonusRoundId: bonusRef.id,
      movieIds,
      movies,
    });

    return NextResponse.json({
      data: {
        bonusRoundId: bonusRef.id,
        movieIds,
        movies,
        status: 'active',
      },
      requestId,
    });
  }

  // Otherwise, this is a vote on an existing bonus round
  const voteParsed = BonusVoteInputSchema.safeParse(body);
  if (!voteParsed.success) {
    throw new ApiError(400, 'Invalid input: provide either movieIds (to create) or movieId (to vote)', requestId);
  }

  const { movieId } = voteParsed.data;
  const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);

  const bonusSnap = await roomRef
    .collection('bonusRounds')
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (bonusSnap.empty) {
    throw new ApiError(404, 'No active bonus round', requestId);
  }

  const bonusDoc = bonusSnap.docs[0];
  const bonusData = bonusDoc.data();

  if (!bonusData.movieIds.includes(movieId)) {
    throw new ApiError(400, 'Movie is not part of this bonus round', requestId);
  }

  await bonusDoc.ref.update({ [`votes.${user.id}`]: movieId });

  const [updatedSnap, membersCountSnap] = await Promise.all([
    bonusDoc.ref.get(),
    roomRef.collection('members').count().get(),
  ]);
  const updatedVotes = (updatedSnap.data()?.votes ?? {}) as Record<string, number>;
  const memberCount = membersCountSnap.data().count;
  const voteCount = Object.keys(updatedVotes).length;

  if (voteCount >= memberCount) {
    const tally = new Map<number, number>();
    for (const vid of Object.values(updatedVotes)) {
      tally.set(vid, (tally.get(vid) ?? 0) + 1);
    }

    const sorted = Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
    const winnerId = sorted[0][0];
    const { movie } = await safeGetMovieById(winnerId);

    await bonusDoc.ref.update({ status: 'completed', winnerId });

    await publishToRoom(room.code, ABLY_EVENTS.BONUS_COMPLETED, {
      winnerId,
      movie,
      voteTally: Object.fromEntries(tally),
    });

    return NextResponse.json({
      data: {
        status: 'completed',
        winnerId,
        movie,
        voteTally: Object.fromEntries(tally),
      },
      requestId,
    });
  }

  await publishToRoom(room.code, ABLY_EVENTS.BONUS_VOTE, {
    voteCount,
    totalMembers: memberCount,
  });

  return NextResponse.json({
    data: {
      status: 'voting',
      voteCount,
      totalMembers: memberCount,
    },
    requestId,
  });
});
