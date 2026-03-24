"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { getPosterUrl, getBackdropUrl } from "@reelrank/shared";
import type { Movie, MovieUserStatus, SoloRanking } from "@reelrank/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check } from "lucide-react";

export default function MovieDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = React.use(props.params as Promise<{ id: string }>);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [status, setStatus] = useState<MovieUserStatus | null>(null);
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [movieRes, statusRes, rankingsRes] = await Promise.all([
        api.movies.get(Number(id)),
        api.solo.status(Number(id)),
        api.solo.ranking(),
      ]);
      if (movieRes.data) setMovie(movieRes.data);
      if (statusRes.data) setStatus(statusRes.data);
      if (rankingsRes.data) {
        const all = rankingsRes.data;
        const found = all.find((r: SoloRanking) => r.movieId === Number(id));
        if (found) setRank({ rank: found.rank, total: all.length });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function toggleWatchlist() {
    if (toggling) return;
    setToggling(true);
    const res = await api.solo.swipe(Number(id), "right");
    if (res.error) {
      toast.error(res.error);
    } else {
      setStatus((prev) => ({
        ...prev,
        swipeDirection: prev?.swipeDirection === "right" ? undefined : "right",
      }));
      toast.success(
        status?.swipeDirection === "right" ? "Removed from watchlist" : "Added to watchlist"
      );
    }
    setToggling(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000]">
        <Skeleton className="w-full h-[50vh] md:h-[60vh]" />
        <div className="px-4 md:px-8 max-w-4xl mx-auto -mt-20 flex gap-6">
          <Skeleton className="w-[140px] md:w-[180px] aspect-[2/3] shrink-0" />
          <div className="flex-1 space-y-3 pt-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#000] flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary text-sm">Movie not found</p>
        <Link href="/ai" className="text-accent text-sm hover:underline">
          &larr; Back to AI chat
        </Link>
      </div>
    );
  }

  const backdropUrl = getBackdropUrl(movie.backdropPath, "large");
  const posterUrl = getPosterUrl(movie.posterPath, "large");
  const year = movie.releaseDate?.slice(0, 4);
  const onWatchlist = status?.swipeDirection === "right";
  const watched = status?.watched;

  return (
    <motion.div
      className="min-h-screen bg-[#000]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <div className="relative w-full h-[50vh] md:h-[60vh]">
        {backdropUrl ? (
          <Image src={backdropUrl} alt="" fill className="object-cover object-top" priority />
        ) : (
          <div className="w-full h-full bg-[#111]" />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, transparent 40%, #000 100%)" }}
        />
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 max-w-4xl mx-auto -mt-20 relative z-10">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Poster */}
          {posterUrl && (
            <div className="shrink-0">
              <Image
                src={posterUrl}
                alt={movie.title}
                width={180}
                height={270}
                className="w-[140px] md:w-[180px] aspect-[2/3] rounded-sm object-cover"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-[#e8e8e8]">{movie.title}</h1>

            <p className="text-sm text-[#888] mt-1">{year}</p>

            {movie.voteAverage > 0 && (
              <p className="text-[#ff2d55] text-lg font-semibold tabular-nums mt-2">
                {movie.voteAverage.toFixed(1)}
              </p>
            )}

            {movie.overview && (
              <p className="text-sm text-[#888] leading-relaxed mt-3">{movie.overview}</p>
            )}

            {/* Status line */}
            <div className="mt-4 space-y-1">
              {watched && (
                <p className="text-sm text-[#e8e8e8]">
                  Watched{watched.rating > 0 && <> · Rated <span className="text-[#ff2d55] font-medium">{watched.rating}/10</span></>}
                  {watched.venue && <> · {watched.venue}</>}
                </p>
              )}
              {onWatchlist && !watched && (
                <p className="text-sm text-[#888]">On your watchlist</p>
              )}
              {rank && (
                <p className="text-sm text-[#888]">
                  Ranked <span className="text-[#e8e8e8] font-medium">#{rank.rank}</span> of {rank.total}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-5">
              <Button variant="secondary" onClick={toggleWatchlist} disabled={toggling} className="min-h-[44px]">
                {onWatchlist ? (
                  <>
                    <Check className="w-4 h-4" />
                    Watchlisted
                  </>
                ) : (
                  "Add to watchlist"
                )}
              </Button>

              <Link href={`/movie/${id}/log`} className={buttonVariants({ className: "min-h-[44px]" })}>
                {watched ? "Log again" : "Log watched"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
