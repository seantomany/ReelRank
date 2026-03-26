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
import { Check, ExternalLink } from "lucide-react";

type WatchProvider = { id: number; name: string; logoPath: string };

type MovieProviders = {
  link: string | null;
  stream: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
  free: WatchProvider[];
};

function ProviderGroup({ title, providers }: { title: string; providers: WatchProvider[] }) {
  if (providers.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-[#888] mb-2">{title}</h3>
      <ul className="flex flex-wrap gap-3 list-none p-0 m-0">
        {providers.map((p) => (
          <li key={`${title}-${p.id}`} className="flex flex-col items-center gap-1 w-[76px] shrink-0">
            {p.logoPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w92${p.logoPath}`}
                alt=""
                width={46}
                height={46}
                className="rounded-md object-contain bg-[#1a1a1a] w-[46px] h-[46px]"
              />
            ) : (
              <div className="w-[46px] h-[46px] rounded-md bg-[#1a1a1a] flex items-center justify-center text-[10px] text-[#666] text-center px-1">
                —
              </div>
            )}
            <span className="text-[10px] text-[#888] text-center leading-tight line-clamp-2 w-full">{p.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MovieDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = React.use(props.params as Promise<{ id: string }>);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [status, setStatus] = useState<MovieUserStatus | null>(null);
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [providers, setProviders] = useState<MovieProviders | null>(null);
  const [friendRatings, setFriendRatings] = useState<
    { userId: string; displayName: string; photoUrl: string | null; rating: number | null }[]
  >([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [movieRes, statusRes, rankingsRes, providersRes, friendsRes] = await Promise.all([
        api.movies.get(Number(id)),
        api.solo.status(Number(id)),
        api.solo.ranking(),
        api.movies.providers(Number(id)),
        api.social.movieFriends(Number(id)),
      ]);
      if (movieRes.data) setMovie(movieRes.data);
      if (statusRes.data) setStatus(statusRes.data);
      if (providersRes.data) setProviders(providersRes.data);
      else setProviders(null);
      if (friendsRes.data && Array.isArray(friendsRes.data)) setFriendRatings(friendsRes.data);
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
    const isCurrentlyOnWatchlist = status?.swipeDirection === "right";
    const direction = isCurrentlyOnWatchlist ? "left" : "right";
    const res = await api.solo.swipe(Number(id), direction);
    if (res.error) {
      toast.error(res.error);
    } else {
      setStatus((prev) => ({
        ...prev,
        swipeDirection: isCurrentlyOnWatchlist ? undefined : "right",
      }));
      toast.success(isCurrentlyOnWatchlist ? "Removed from watchlist" : "Added to watchlist");
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
        <Link href="/" className="text-accent text-sm hover:underline">
          &larr; Back to home
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

        {friendRatings.length > 0 && (
          <section className="mt-10 pt-8 border-t border-[#222]">
            <h2 className="text-sm font-semibold text-[#e8e8e8] mb-4">Friends Who Watched</h2>
            <div className="space-y-3">
              {friendRatings.map((fr) => (
                <div key={fr.userId} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center text-xs text-[#888] font-medium shrink-0 overflow-hidden">
                    {fr.photoUrl ? (
                      <Image src={fr.photoUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      fr.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-sm text-[#e8e8e8]">{fr.displayName}</span>
                  {fr.rating != null && (
                    <span className="ml-auto text-sm text-[#ff2d55] font-medium tabular-nums">{fr.rating}/10</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {providers &&
          (providers.stream.length > 0 ||
            providers.rent.length > 0 ||
            providers.buy.length > 0 ||
            providers.free.length > 0 ||
            providers.link) && (
            <section className="mt-10 pt-8 border-t border-[#222]" aria-labelledby="where-to-watch-heading">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-4">
                <h2 id="where-to-watch-heading" className="text-sm font-semibold text-[#e8e8e8]">
                  Where to Watch
                </h2>
                <p className="text-xs text-[#666]">United States</p>
              </div>
              <div className="space-y-5">
                <ProviderGroup title="Stream" providers={providers.stream} />
                <ProviderGroup title="Rent" providers={providers.rent} />
                <ProviderGroup title="Buy" providers={providers.buy} />
                <ProviderGroup title="Free" providers={providers.free} />
              </div>
              {providers.link && (
                <a
                  href={providers.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-5 text-sm text-[#ff2d55] hover:underline"
                >
                  More options on TMDB
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
                </a>
              )}
            </section>
          )}
      </div>
    </motion.div>
  );
}
