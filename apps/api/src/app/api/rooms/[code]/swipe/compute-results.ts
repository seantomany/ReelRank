import { getDb, COLLECTIONS } from '@/lib/firestore';
import { publishToRoom } from '@/lib/ably';
import { safeGetMovieById } from '@/lib/tmdb';
import { computeSimpleMajority, computeEloGroup, computeRankedChoice } from '@/lib/algorithms';
import { ABLY_EVENTS } from '@reelrank/shared';
import type { Movie, RoomSwipe, AlgorithmType } from '@reelrank/shared';

export async function computeAndStoreResults(
  roomId: string,
  room: FirebaseFirestore.DocumentData,
  roomRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  const existingResult = await roomRef
    .collection('results')
    .orderBy('computedAt', 'desc')
    .limit(1)
    .get();

  if (!existingResult.empty) return;

  const [swipesSnap, moviesSnap, membersSnap] = await Promise.all([
    roomRef.collection('swipes').get(),
    roomRef.collection('movies').get(),
    roomRef.collection('members').get(),
  ]);

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
  const resultRef = roomRef.collection('results').doc();
  const resultData = {
    id: resultRef.id,
    roomId,
    computedAt: now,
    algorithmVersion,
    rankedMovies,
  };

  await resultRef.set(resultData);

  await getDb().collection(COLLECTIONS.rooms).doc(roomId).update({
    status: 'results',
    updatedAt: now,
  });

  await publishToRoom(room.code, ABLY_EVENTS.RESULTS_READY, {
    resultId: resultRef.id,
  });
}
