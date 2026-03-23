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

const REFETCH_INTERVAL = 5;

function pickPair(
  rankings: SoloRanking[],
  lastPair: [number, number] | null
): [SoloRanking, SoloRanking] | null {
  if (rankings.length < 2) return null;

  const sorted = [...rankings].sort((a, b) => a.eloScore - b.eloScore);
  let attempts = 0;

  while (attempts < 20) {
    const idx = Math.floor(Math.random() * (sorted.length - 1));
    const a = sorted[idx];
    const b = sorted[idx + 1];
    const ids: [number, number] = [a.movieId, b.movieId].sort(
      (x, y) => x - y
    ) as [number, number];

    if (
      !lastPair ||
      ids[0] !== lastPair[0] ||
      ids[1] !== lastPair[1] ||
      rankings.length === 2
    ) {
      return Math.random() > 0.5 ? [a, b] : [b, a];
    }
    attempts++;
  }

  const a = sorted[0];
  const b = sorted[sorted.length - 1];
  return Math.random() > 0.5 ? [a, b] : [b, a];
}

export default function ThisOrThatPage() {
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [pair, setPair] = useState<[SoloRanking, SoloRanking] | null>(null);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [choiceCount, setChoiceCount] = useState(0);
  const lastPairRef = useRef<[number, number] | null>(null);

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
        const p = pickPair(data, null);
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
    const next = pickPair(source, lastPairRef.current);
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
    } else if (nextCount % REFETCH_INTERVAL === 0) {
      const fresh = await fetchRankings();
      if (fresh) currentRankings = fresh;
    }

    setFlashId(null);
    setChoosing(false);
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

  if (!pair || rankings.length < 2) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-[#888]">
          Swipe some movies first{" "}
          <Link href="/discover" className="text-[#e8e8e8] underline">
            in Discover
          </Link>
        </p>
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
    ? [...rankings].sort((x, y) => y.eloScore - x.eloScore)[0]
    : null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      {/* Current #1 indicator + choice count */}
      <div className="mb-6 text-center">
        {topRanked && (
          <p className="text-xs text-[#888]">
            Your #1: <span className="text-[#e8e8e8] font-medium">{topRanked.movie.title}</span>
          </p>
        )}
        {choiceCount > 0 && (
          <p className="text-xs text-[#888] mt-0.5 tabular-nums">
            {choiceCount} {choiceCount === 1 ? "choice" : "choices"} made
          </p>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${movieA.id}-${movieB.id}`}
          className="flex w-full flex-col items-center gap-4 md:flex-row md:justify-center md:gap-2"
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
                borderColor:
                  flashId === movieA.id ? "#ff2d55" : "transparent",
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
                <div className="flex h-full w-full items-center justify-center text-xs bg-[#111] text-[#888]">
                  No poster
                </div>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-[#e8e8e8]">
              {movieA.title}
            </p>
            {yearA && (
              <p className="text-xs text-[#888]">
                {yearA}
              </p>
            )}
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
                borderColor:
                  flashId === movieB.id ? "#ff2d55" : "transparent",
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
                <div className="flex h-full w-full items-center justify-center text-xs bg-[#111] text-[#888]">
                  No poster
                </div>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-[#e8e8e8]">
              {movieB.title}
            </p>
            {yearB && (
              <p className="text-xs text-[#888]">
                {yearB}
              </p>
            )}
          </motion.button>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={handleSkip}
        disabled={choosing}
        className="mt-6 min-h-[44px] min-w-[44px] text-xs text-[#888] hover:text-[#aaa] transition-colors disabled:pointer-events-none"
      >
        Skip
      </button>
    </div>
  );
}
