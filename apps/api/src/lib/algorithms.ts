import type { Movie, MovieScore, RoomSwipe } from '@reelrank/shared';
import { ELO_K_FACTOR, ELO_INITIAL_RATING } from '@reelrank/shared';

export function computeSimpleMajority(
  swipes: RoomSwipe[],
  movies: Movie[],
  totalMembers: number
): MovieScore[] {
  const movieMap = new Map(movies.map((m) => [m.id, m]));
  const scoreMap = new Map<number, { right: number; left: number }>();

  for (const movie of movies) {
    scoreMap.set(movie.id, { right: 0, left: 0 });
  }

  for (const swipe of swipes) {
    const counts = scoreMap.get(swipe.movieId);
    if (!counts) continue;
    if (swipe.direction === 'right') {
      counts.right++;
    } else {
      counts.left++;
    }
  }

  const results: MovieScore[] = [];
  for (const [movieId, counts] of scoreMap) {
    const movie = movieMap.get(movieId);
    if (!movie) continue;

    const score = totalMembers > 0
      ? Math.round((counts.right / totalMembers) * 100)
      : 0;

    results.push({
      movieId,
      movie,
      score,
      rightSwipes: counts.right,
      leftSwipes: counts.left,
      totalVoters: totalMembers,
      popularityBonus: 0,
      ratingBonus: 0,
      finalScore: score,
    });
  }

  return results.sort((a, b) => b.finalScore - a.finalScore);
}

function eloExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function computeEloGroup(
  swipes: RoomSwipe[],
  movies: Movie[],
  totalMembers: number
): MovieScore[] {
  const movieMap = new Map(movies.map((m) => [m.id, m]));
  const elos = new Map<number, number>();
  const swipeCounts = new Map<number, { right: number; left: number }>();

  for (const movie of movies) {
    elos.set(movie.id, ELO_INITIAL_RATING);
    swipeCounts.set(movie.id, { right: 0, left: 0 });
  }

  const userSwipes = new Map<string, RoomSwipe[]>();
  for (const swipe of swipes) {
    const counts = swipeCounts.get(swipe.movieId);
    if (counts) {
      if (swipe.direction === 'right') counts.right++;
      else counts.left++;
    }
    const existing = userSwipes.get(swipe.userId) ?? [];
    existing.push(swipe);
    userSwipes.set(swipe.userId, existing);
  }

  for (const [, userSwipeList] of userSwipes) {
    const rightSwiped = userSwipeList.filter((s) => s.direction === 'right');
    const leftSwiped = userSwipeList.filter((s) => s.direction === 'left');

    for (const winner of rightSwiped) {
      for (const loser of leftSwiped) {
        const winnerElo = elos.get(winner.movieId) ?? ELO_INITIAL_RATING;
        const loserElo = elos.get(loser.movieId) ?? ELO_INITIAL_RATING;

        const expectedWinner = eloExpected(winnerElo, loserElo);
        const expectedLoser = eloExpected(loserElo, winnerElo);

        elos.set(
          winner.movieId,
          winnerElo + ELO_K_FACTOR * (1 - expectedWinner)
        );
        elos.set(
          loser.movieId,
          loserElo + ELO_K_FACTOR * (0 - expectedLoser)
        );
      }
    }
  }

  const results: MovieScore[] = [];
  for (const [movieId, elo] of elos) {
    const movie = movieMap.get(movieId);
    if (!movie) continue;
    const counts = swipeCounts.get(movieId) ?? { right: 0, left: 0 };

    results.push({
      movieId,
      movie,
      score: elo,
      rightSwipes: counts.right,
      leftSwipes: counts.left,
      totalVoters: totalMembers,
      popularityBonus: 0,
      ratingBonus: 0,
      finalScore: elo,
    });
  }

  return results.sort((a, b) => b.finalScore - a.finalScore);
}

export function computeRankedChoice(
  swipes: RoomSwipe[],
  movies: Movie[],
  totalMembers: number
): MovieScore[] {
  const movieMap = new Map(movies.map((m) => [m.id, m]));
  const swipeCounts = new Map<number, { right: number; left: number }>();

  for (const movie of movies) {
    swipeCounts.set(movie.id, { right: 0, left: 0 });
  }

  for (const swipe of swipes) {
    const counts = swipeCounts.get(swipe.movieId);
    if (counts) {
      if (swipe.direction === 'right') counts.right++;
      else counts.left++;
    }
  }

  const userBallots = new Map<string, number[]>();
  const userSwipes = new Map<string, RoomSwipe[]>();
  for (const swipe of swipes) {
    const existing = userSwipes.get(swipe.userId) ?? [];
    existing.push(swipe);
    userSwipes.set(swipe.userId, existing);
  }

  for (const [userId, userSwipeList] of userSwipes) {
    const rightSwiped = userSwipeList
      .filter((s) => s.direction === 'right')
      .map((s) => s.movieId);
    if (rightSwiped.length > 0) {
      userBallots.set(userId, rightSwiped);
    }
  }

  const remaining = new Set(movies.map((m) => m.id));
  const eliminationOrder: number[] = [];
  const ballots = Array.from(userBallots.values()).map((b) => [...b]);

  while (remaining.size > 1) {
    const firstPlaceVotes = new Map<number, number>();
    for (const id of remaining) {
      firstPlaceVotes.set(id, 0);
    }

    for (const ballot of ballots) {
      const topChoice = ballot.find((id) => remaining.has(id));
      if (topChoice !== undefined) {
        firstPlaceVotes.set(
          topChoice,
          (firstPlaceVotes.get(topChoice) ?? 0) + 1
        );
      }
    }

    const totalVotes = Array.from(firstPlaceVotes.values()).reduce(
      (a, b) => a + b,
      0
    );
    const majority = totalVotes / 2;

    let foundWinner = false;
    for (const [movieId, votes] of firstPlaceVotes) {
      if (votes >= majority) {
        const others = Array.from(remaining).filter((id) => id !== movieId);
        others.sort(
          (a, b) =>
            (firstPlaceVotes.get(a) ?? 0) - (firstPlaceVotes.get(b) ?? 0)
        );
        eliminationOrder.push(...others);
        eliminationOrder.push(movieId);
        remaining.clear();
        foundWinner = true;
        break;
      }
    }
    if (foundWinner) break;

    let minVotes = Infinity;
    let toEliminate = -1;
    for (const [movieId, votes] of firstPlaceVotes) {
      if (votes < minVotes) {
        minVotes = votes;
        toEliminate = movieId;
      }
    }

    if (toEliminate !== -1) {
      remaining.delete(toEliminate);
      eliminationOrder.push(toEliminate);
    } else {
      break;
    }
  }

  if (remaining.size === 1) {
    eliminationOrder.push(Array.from(remaining)[0]);
  }

  const ranked = [...eliminationOrder].reverse();

  const movieIdsInRanked = new Set(ranked);
  for (const movie of movies) {
    if (!movieIdsInRanked.has(movie.id)) {
      ranked.push(movie.id);
    }
  }

  return ranked.map((movieId, index) => {
    const movie = movieMap.get(movieId)!;
    const counts = swipeCounts.get(movieId) ?? { right: 0, left: 0 };
    const positionScore = (ranked.length - index) / ranked.length;

    return {
      movieId,
      movie,
      score: positionScore,
      rightSwipes: counts.right,
      leftSwipes: counts.left,
      totalVoters: totalMembers,
      popularityBonus: 0,
      ratingBonus: 0,
      finalScore: positionScore,
    };
  });
}
