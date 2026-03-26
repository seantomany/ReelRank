"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { SoloRanking } from "@reelrank/shared";
import { getPosterUrl } from "@reelrank/shared";

const seenPairKeys = new Set<string>();

function pairKey(idA: number, idB: number): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

function pickAdjacentPair(
  rankings: SoloRanking[],
  _lastPair: [number, number] | null
): [SoloRanking, SoloRanking] | null {
  if (rankings.length < 2) return null;

  const sorted = [...rankings].sort((a, b) => a.rank - b.rank);
  const totalPossible = (sorted.length * (sorted.length - 1)) / 2;
  if (seenPairKeys.size >= totalPossible) {
    seenPairKeys.clear();
  }

  let attempts = 0;
  while (attempts < 40) {
    const idx = Math.floor(Math.random() * (sorted.length - 1));
    const a = sorted[idx];
    const b = sorted[idx + 1];
    const key = pairKey(a.movieId, b.movieId);

    if (!seenPairKeys.has(key) || rankings.length === 2) {
      seenPairKeys.add(key);
      return Math.random() > 0.5 ? [a, b] : [b, a];
    }
    attempts++;
  }

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const key = pairKey(sorted[i].movieId, sorted[j].movieId);
      if (!seenPairKeys.has(key)) {
        seenPairKeys.add(key);
        return Math.random() > 0.5 ? [sorted[i], sorted[j]] : [sorted[j], sorted[i]];
      }
    }
  }

  seenPairKeys.clear();
  const a = sorted[0];
  const b = sorted[1];
  seenPairKeys.add(pairKey(a.movieId, b.movieId));
  return Math.random() > 0.5 ? [a, b] : [b, a];
}

function getSessionLimit(count: number): number {
  if (count <= 2) return count - 1;
  return Math.min(5, Math.max(3, count - 1));
}

export default function RefineRankingsPage() {
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [pair, setPair] = useState<[SoloRanking, SoloRanking] | null>(null);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [choiceCount, setChoiceCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const lastPairRef = useRef<[number, number] | null>(null);

  const sessionLimit = getSessionLimit(rankings.length);

  const fetchRankings = useCallback(async () => {
    const res = await api.solo.ranking();
    if (res.data) {
      setRankings(res.data);
      return res.data;
    }
    if (res.error) toast.error(res.error);
    return null;
  }, []);

  useEffect(() => {
    fetchRankings().then((data) => {
      if (data) {
        const p = pickAdjacentPair(data, null);
        setPair(p);
        if (p) {
          lastPairRef.current = [p[0].movieId, p[1].movieId].sort(
            (a, b) => a - b
          ) as [number, number];
        }
      }
      setLoading(false);
    });
  }, [fetchRankings]);

  const advancePair = (source: SoloRanking[]) => {
    const next = pickAdjacentPair(source, lastPairRef.current);
    setPair(next);
    if (next) {
      lastPairRef.current = [next[0].movieId, next[1].movieId].sort(
        (a, b) => a - b
      ) as [number, number];
    }
  };

  const handleChoice = async (chosenId: number) => {
    if (choosing || !pair) return;
    setChoosing(true);
    setFlashId(chosenId);

    const res = await api.solo.pairwise(
      pair[0].movie.id,
      pair[1].movie.id,
      chosenId
    );

    if (res.error) {
      toast.error(res.error);
      setChoosing(false);
      setFlashId(null);
      return;
    }

    await new Promise((r) => setTimeout(r, 200));

    const nextCount = choiceCount + 1;
    setChoiceCount(nextCount);

    let currentRankings = rankings;
    if (res.data?.rankings) {
      currentRankings = res.data.rankings;
      setRankings(currentRankings);
    } else if (nextCount % 5 === 0) {
      const fresh = await fetchRankings();
      if (fresh) currentRankings = fresh;
    }

    setFlashId(null);
    setChoosing(false);

    if (nextCount >= sessionLimit) {
      setSessionDone(true);
      return;
    }

    advancePair(currentRankings);
  };

  const handleSkip = () => {
    if (choosing || !pair) return;
    advancePair(rankings);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
          <Skeleton className="aspect-[2/3] w-[240px] rounded-sm md:w-[280px]" />
          <Skeleton className="aspect-[2/3] w-[240px] rounded-sm md:w-[280px]" />
        </div>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <p className="text-3xl font-semibold text-[#e8e8e8]">{sessionLimit}/{sessionLimit}</p>
          <p className="text-sm text-[#888] mt-2">Session complete — rankings refined</p>
          <div className="flex gap-3 mt-6 justify-center">
            <button
              onClick={() => { setChoiceCount(0); setSessionDone(false); advancePair(rankings); }}
              className="rounded-full bg-[#111] px-5 py-2 text-sm text-[#e8e8e8] hover:bg-[#1a1a1a] transition-colors"
            >
              Go again
            </button>
            <Link
              href="/profile"
              className="rounded-full bg-[#ff2d55] px-5 py-2 text-sm text-white hover:bg-[#e0264b] transition-colors"
            >
              View rankings
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!pair || rankings.length < 2) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-[#888]">
            Watch and rank some movies first
          </p>
          <p className="text-xs text-[#888] mt-2">
            You need at least 2 ranked movies to start refining.
          </p>
          <Link href="/discover" className="inline-block mt-4 text-sm text-[#ff2d55] hover:text-[#e8e8e8] transition-colors">
            Discover movies
          </Link>
        </div>
      </div>
    );
  }

  const [a, b] = pair;
  const movieA = a.movie;
  const movieB = b.movie;
  const posterA = getPosterUrl(movieA.posterPath, "large");
  const posterB = getPosterUrl(movieB.posterPath, "large");
  const yearA = movieA.releaseDate?.split("-")[0] ?? "";
  const yearB = movieB.releaseDate?.split("-")[0] ?? "";

  const topRanked = rankings.length > 0
    ? [...rankings].sort((x, y) => x.rank - y.rank)[0]
    : null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      <div className="mb-6 w-full max-w-xs mx-auto">
        <p className="text-xs uppercase tracking-widest text-[#888] mb-3 text-center">Refine Rankings</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-[#111] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#ff2d55] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(choiceCount / sessionLimit) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs text-[#888] tabular-nums shrink-0">{choiceCount}/{sessionLimit}</span>
        </div>
        {topRanked && (
          <p className="text-xs text-[#888] mt-2 text-center">
            Your #1: <span className="text-[#e8e8e8] font-medium">{topRanked.movie.title}</span>
            <span className="text-[#ff2d55] ml-1">{topRanked.beliScore.toFixed(1)}</span>
          </p>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${movieA.id}-${movieB.id}`}
          className="flex w-full flex-col items-center gap-4 md:flex-row md:justify-center md:gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            onClick={() => handleChoice(movieA.id)}
            disabled={choosing}
            className="group flex w-full max-w-[240px] flex-col items-center disabled:pointer-events-none md:max-w-[280px]"
          >
            <div
              className="relative aspect-[2/3] w-full overflow-hidden rounded-sm"
              style={{
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: flashId === movieA.id ? "#ff2d55" : "transparent",
              }}
            >
              {posterA ? (
                <Image
                  src={posterA}
                  alt={movieA.title}
                  fill
                  className="object-cover transition-opacity duration-150 group-hover:opacity-80 group-active:opacity-80"
                  sizes="(max-width: 768px) 240px, 280px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs bg-[#111] text-[#888]">No poster</div>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-[#e8e8e8]">{movieA.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {yearA && <span className="text-xs text-[#888]">{yearA}</span>}
              <span className="text-xs text-[#ff2d55] tabular-nums">#{a.rank} · {a.beliScore.toFixed(1)}</span>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            onClick={() => handleChoice(movieB.id)}
            disabled={choosing}
            className="group flex w-full max-w-[240px] flex-col items-center disabled:pointer-events-none md:max-w-[280px]"
          >
            <div
              className="relative aspect-[2/3] w-full overflow-hidden rounded-sm"
              style={{
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: flashId === movieB.id ? "#ff2d55" : "transparent",
              }}
            >
              {posterB ? (
                <Image
                  src={posterB}
                  alt={movieB.title}
                  fill
                  className="object-cover transition-opacity duration-150 group-hover:opacity-80 group-active:opacity-80"
                  sizes="(max-width: 768px) 240px, 280px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs bg-[#111] text-[#888]">No poster</div>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-[#e8e8e8]">{movieB.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {yearB && <span className="text-xs text-[#888]">{yearB}</span>}
              <span className="text-xs text-[#ff2d55] tabular-nums">#{b.rank} · {b.beliScore.toFixed(1)}</span>
            </div>
          </motion.button>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSkip}
          disabled={choosing}
          className="min-h-[44px] min-w-[44px] text-xs text-[#888] hover:text-[#aaa] transition-colors disabled:pointer-events-none"
        >
          Skip
        </button>
        <Link
          href="/profile"
          className="min-h-[44px] flex items-center text-xs text-[#ff2d55] hover:text-[#e8e8e8] transition-colors"
        >
          Done — view rankings
        </Link>
      </div>
    </div>
  );
}
