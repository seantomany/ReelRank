"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { subscribeToRoom } from "@/lib/ably";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPosterUrl, ABLY_EVENTS } from "@reelrank/shared";
import type { RoomResult } from "@reelrank/shared";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export default function ResultsPage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = React.use(props.params as Promise<{ code: string }>);
  const router = useRouter();

  const [result, setResult] = useState<RoomResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(
    async (retriesLeft = MAX_RETRIES) => {
      const res = await api.rooms.results(code);
      if (res.data) {
        setResult(res.data);
        setLoading(false);
        return;
      }

      if (res.error && retriesLeft > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
        return fetchResults(retriesLeft - 1);
      }

      if (res.error) toast.error(res.error);
      setLoading(false);
    },
    [code]
  );

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    const unsubscribe = subscribeToRoom(code, {
      [ABLY_EVENTS.RESULTS_READY]: () => {
        fetchResults();
      },
    });
    return unsubscribe;
  }, [code, fetchResults]);

  if (loading) {
    return (
      <div className="mx-auto max-w-sm px-4 py-8">
        <div className="text-center">
          <Skeleton className="mx-auto aspect-[2/3] w-[200px] rounded-sm" />
          <Skeleton className="mx-auto mt-4 h-6 w-40" />
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[#888]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff2d55] animate-pulse" />
            Computing results
          </p>
        </div>
      </div>
    );
  }

  if (!result || result.rankedMovies.length === 0) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-sm text-[#888]">No results available</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => fetchResults()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const winner = result.rankedMovies[0];
  const runnersUp = result.rankedMovies.slice(1);
  const winnerPoster = getPosterUrl(winner.movie.posterPath, "large");
  const winnerYear = winner.movie.releaseDate?.slice(0, 4);
  const topScore = winner.finalScore;

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      {/* Winner */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-[#ff2d55] mb-3">Winner</p>
        <Link href={`/movie/${winner.movieId}`}>
          {winnerPoster ? (
            <Image
              src={winnerPoster}
              alt={winner.movie.title}
              width={200}
              height={300}
              className="mx-auto aspect-[2/3] w-[200px] rounded-sm object-cover"
            />
          ) : (
            <div className="mx-auto flex aspect-[2/3] w-[200px] items-center justify-center rounded-sm bg-[#111] text-sm text-[#888]">
              No poster
            </div>
          )}
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-[#e8e8e8]">
          {winner.movie.title}
        </h1>
        {winnerYear && (
          <p className="text-sm text-[#888] mt-0.5">{winnerYear}</p>
        )}
        <p className="mt-1 text-sm text-[#ff2d55] tabular-nums">
          {winner.finalScore.toFixed(1)} pts · {winner.rightSwipes}/{winner.rightSwipes + winner.leftSwipes} votes
        </p>
      </div>

      {/* Runners up */}
      {runnersUp.length > 0 && (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-widest text-[#888] mb-3">Runners up</p>
          {runnersUp.map((entry, i) => {
            const poster = getPosterUrl(entry.movie.posterPath, "small");
            const barWidth = topScore > 0 ? (entry.finalScore / topScore) * 100 : 0;

            return (
              <Link
                key={entry.movieId}
                href={`/movie/${entry.movieId}`}
                className="flex items-center gap-3 py-2 group"
              >
                <span className="w-5 shrink-0 text-right text-xs text-[#888] tabular-nums">
                  {i + 2}
                </span>
                {poster ? (
                  <Image
                    src={poster}
                    alt={entry.movie.title}
                    width={40}
                    height={60}
                    className="h-15 w-10 shrink-0 rounded-sm object-cover group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="h-15 w-10 shrink-0 rounded-sm bg-[#111]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#e8e8e8]">
                    {entry.movie.title}
                  </p>
                  <p className="text-xs text-[#888] tabular-nums">
                    {entry.finalScore.toFixed(1)} pts · {entry.rightSwipes}/{entry.rightSwipes + entry.leftSwipes} votes
                  </p>
                  <div className="mt-1 h-1 w-full overflow-hidden bg-[#111] rounded-full">
                    <div
                      className="h-full bg-[#ff2d55] rounded-full"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-10 flex gap-3 justify-center">
        <Button variant="secondary" onClick={() => router.push("/group")}>
          Back to groups
        </Button>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Home
        </Button>
      </div>
    </div>
  );
}
