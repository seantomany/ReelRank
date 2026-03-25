import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { findRoomByCode, verifyRoomMembership, validateRoomCode } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { safeGetMovieById } from '@/lib/tmdb';
import { computeSimpleMajority, computeEloGroup, computeRankedChoice } from '@/lib/algorithms';
import { ABLY_EVENTS } from '@reelrank/shared';
import type { Movie, RoomSwipe, AlgorithmType, SwipeDirection } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';
import { publishToRoom } from '@/lib/ably';

async function getMemberDetails(roomRef: FirebaseFirestore.DocumentReference) {
  const [swipesSnap, moviesSnap, membersSnap] = await Promise.all([
    roomRef.collection('swipes').get(),
    roomRef.collection('movies').get(),
    roomRef.collection('members').get(),
  ]);

  const memberIds = membersSnap.docs.map((d) => d.data().userId as string);
  const userRefs = memberIds.map((uid) => getDb().collection(COLLECTIONS.users).doc(uid));
  const userDocs = userRefs.length > 0 ? await getDb().getAll(...userRefs) : [];
  const userMap = new Map(
    userDocs.filter((d) => d.exists).map((d) => [d.id, d.data()!])
  );

  const getUsername = (userId: string) => userMap.get(userId)?.username ?? null;

  const memberVotes = swipesSnap.docs.map((d) => {
    const data = d.data();
    return {
      userId: data.userId as string,
      username: getUsername(data.userId),
      movieId: data.movieId as number,
      direction: data.direction as SwipeDirection,
      superlike: (data.superlike as boolean) ?? false,
    };
  });

  const submissions = moviesSnap.docs.map((d) => {
    const data = d.data();
    return {
      movieId: data.movieId as number,
      submittedBy: {
        userId: data.submittedByUserId as string,
        username: getUsername(data.submittedByUserId),
      },
    };
  });

  const memberStats = memberIds.map((userId) => {
    const userSwipes = memberVotes.filter((v) => v.userId === userId);
    const rightCount = userSwipes.filter((v) => v.direction === 'right').length;
    const leftCount = userSwipes.filter((v) => v.direction === 'left').length;
    const superlikeMovie = userSwipes.find((v) => v.superlike);

    const rightMovieIds = new Set(userSwipes.filter((v) => v.direction === 'right').map((v) => v.movieId));
    const allRightSets = memberIds
      .filter((uid) => uid !== userId)
      .map((uid) => new Set(memberVotes.filter((v) => v.userId === uid && v.direction === 'right').map((v) => v.movieId)));

    let agreementScore = 0;
    if (allRightSets.length > 0) {
      const agreements = allRightSets.map((otherSet) => {
        const allMovies = new Set([...rightMovieIds, ...otherSet]);
        if (allMovies.size === 0) return 1;
        const overlap = [...rightMovieIds].filter((id) => otherSet.has(id)).length;
        return overlap / allMovies.size;
      });
      agreementScore = Math.round((agreements.reduce((a, b) => a + b, 0) / agreements.length) * 100);
    }

    return {
      userId,
      username: getUsername(userId),
      rightCount,
      leftCount,
      agreementScore,
      superlikeMovieId: superlikeMovie?.movieId ?? null,
    };
  });

  return { memberVotes, submissions, memberStats, swipesSnap, moviesSnap, membersSnap };
}

export const GET = withAuthAndRateLimit('general', async (_req: NextRequest, { user, requestId, params }) => {
  const code = validateRoomCode(params?.code ?? '', requestId);
  const { roomId, room } = await findRoomByCode(code, requestId);
  await verifyRoomMembership(roomId, user.id, requestId);

  const roomRef = getDb().collection(COLLECTIONS.rooms).doc(roomId);

  const cachedResults = await roomRef
    .collection('results')
    .orderBy('computedAt', 'desc')
    .limit(1)
    .get();

  if (!cachedResults.empty) {
    const { memberVotes, submissions, memberStats } = await getMemberDetails(roomRef);
    return NextResponse.json({
      data: {
        ...cachedResults.docs[0].data(),
        memberVotes,
        submissions,
        memberStats,
      },
      requestId,
    });
  }

  if (room.status !== 'swiping' && room.status !== 'results') {
    throw new ApiError(400, 'Room has not started swiping yet', requestId);
  }

  const membersSnap = await roomRef.collection('members').get();
  const allMembersDone = membersSnap.docs.every((d) => d.data().doneAt != null);

  if (!allMembersDone) {
    const doneCount = membersSnap.docs.filter((d) => d.data().doneAt != null).length;
    throw new ApiError(
      409,
      `Waiting for all members to finish swiping (${doneCount}/${membersSnap.size} done)`,
      requestId
    );
  }

  const { memberVotes, submissions, memberStats, swipesSnap, moviesSnap } = await getMemberDetails(roomRef);

  const swipes: RoomSwipe[] = swipesSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      roomId,
      userId: data.userId,
      movieId: data.movieId,
      direction: data.direction,
      superlike: data.superlike ?? false,
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    };
  });

  const warnings: string[] = [];
  const movieIds = moviesSnap.docs.map((d) => d.data().movieId);
  const movieResults = await Promise.all(movieIds.map((id) => safeGetMovieById(id)));

  const movies: Movie[] = movieResults.map(({ movie, hydrated }) => {
    if (!hydrated) warnings.push(`Movie ${movie.id} could not be loaded from TMDB`);
    return movie;
  });

  const totalMembers = membersSnap.size;
  const algorithmVersion = (room.algorithmVersion ?? 'simple_majority_v1') as AlgorithmType;

  let rankedMovies;
  switch (algorithmVersion) {
    case 'elo_group_v1':
      rankedMovies = computeEloGroup(swipes, movies, totalMembers);
      break;
    case 'ranked_choice_v1':
      rankedMovies = computeRankedChoice(swipes, movies, totalMembers);
      break;
    default:
      rankedMovies = computeSimpleMajority(swipes, movies, totalMembers);
  }

  const now = new Date();
  const db = getDb();
  const resultRef = roomRef.collection('results').doc();
  const resultData = {
    id: resultRef.id,
    roomId,
    computedAt: now,
    algorithmVersion,
    rankedMovies,
  };

  const wrote = await db.runTransaction(async (txn) => {
    const check = await txn.get(
      roomRef.collection('results').orderBy('computedAt', 'desc').limit(1)
    );
    if (!check.empty) return check.docs[0].data();
    txn.set(resultRef, resultData);
    txn.update(db.collection(COLLECTIONS.rooms).doc(roomId), {
      status: 'results',
      updatedAt: now,
    });
    return null;
  });

  const finalResult = wrote ?? resultData;

  if (!wrote) {
    await publishToRoom(room.code, ABLY_EVENTS.RESULTS_READY, {
      resultId: resultRef.id,
    });
  }

  return NextResponse.json({
    data: {
      ...finalResult,
      memberVotes,
      submissions,
      memberStats,
    },
    ...(warnings.length > 0 ? { warnings } : {}),
    requestId,
  });
});
