"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { getPosterUrl } from "@reelrank/shared";
import type {
  SoloRanking,
  WatchedMovie,
  SoloSwipe,
  Movie,
} from "@reelrank/shared";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";

interface Stats {
  totalSwipes: number;
  rightSwipes: number;
  leftSwipes: number;
  pairwiseChoices: number;
  moviesWatched: number;
  winRate: number;
}

export default function ProfilePage() {
  const { user } = useAuth();

  const [tab, setTab] = useState("rankings");
  const [stats, setStats] = useState<Stats | null>(null);
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [watchlist, setWatchlist] = useState<(SoloSwipe & { movie: Movie })[]>([]);
  const [watched, setWatched] = useState<(WatchedMovie & { movie?: Movie })[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [loadingWatched, setLoadingWatched] = useState(true);

  useEffect(() => {
    api.solo.stats().then((res) => {
      if (res.data) setStats(res.data);
      if (res.error) toast.error(res.error);
    }).finally(() => setLoadingStats(false));

    api.solo.ranking().then((res) => {
      if (res.data) setRankings(res.data);
      if (res.error) toast.error(res.error);
    }).finally(() => setLoadingRankings(false));

    api.solo.lists("want").then((res) => {
      if (res.data) setWatchlist(res.data);
      if (res.error) toast.error(res.error);
    }).finally(() => setLoadingWatchlist(false));

    api.solo.watched().then((res) => {
      if (res.data) setWatched(res.data);
      if (res.error) toast.error(res.error);
    }).finally(() => setLoadingWatched(false));
  }, []);

  const displayName = user?.email ? user.email.split("@")[0] : "User";
  const initial = displayName.charAt(0).toUpperCase();

  const rankCount = rankings.length;
  const watchlistCount = watchlist.length;
  const watchedCount = watched.length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#111]">
          <span className="text-sm text-[#888]">{initial}</span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-[#e8e8e8] truncate">
            {displayName}
          </p>
          {loadingStats ? (
            <Skeleton className="h-4 w-48 mt-0.5" />
          ) : stats ? (
            <p className="text-sm text-[#888]">
              {stats.pairwiseChoices} ranked · {stats.moviesWatched} watched · {stats.totalSwipes} swiped
            </p>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="rankings">
              Rankings{!loadingRankings && rankCount > 0 ? ` ${rankCount}` : ""}
            </TabsTrigger>
            <TabsTrigger value="watchlist">
              Watchlist{!loadingWatchlist && watchlistCount > 0 ? ` ${watchlistCount}` : ""}
            </TabsTrigger>
            <TabsTrigger value="watched">
              Watched{!loadingWatched && watchedCount > 0 ? ` ${watchedCount}` : ""}
            </TabsTrigger>
          </TabsList>

          {/* Rankings */}
          <TabsContent value="rankings">
            {loadingRankings ? (
              <div className="space-y-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-4 w-5" />
                    <Skeleton className="w-11 h-[66px] rounded-sm" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : rankings.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-[#888]">No rankings yet</p>
                <p className="text-xs text-[#888] mt-1">
                  Use{" "}
                  <Link href="/this-or-that" className="text-[#e8e8e8] underline">
                    This or That
                  </Link>{" "}
                  to start ranking your movies
                </p>
              </div>
            ) : (
              <div>
                {rankings.map((item) => {
                  const poster = getPosterUrl(item.movie.posterPath, "small");
                  const isTop3 = item.rank <= 3;
                  const rankLabel =
                    item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : String(item.rank);

                  return (
                    <Link
                      key={item.movieId}
                      href={`/movie/${item.movieId}`}
                      className="flex items-center gap-3 py-2 group"
                    >
                      <span
                        className={`w-7 shrink-0 text-right tabular-nums ${
                          isTop3 ? "text-base" : "text-sm text-[#888]"
                        }`}
                      >
                        {rankLabel}
                      </span>
                      {poster ? (
                        <Image
                          src={poster}
                          alt={item.movie.title}
                          width={44}
                          height={66}
                          className="w-11 h-[66px] shrink-0 rounded-sm object-cover group-hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="w-11 h-[66px] shrink-0 rounded-sm bg-[#111]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`truncate text-sm ${isTop3 ? "text-[#e8e8e8] font-medium" : "text-[#e8e8e8]"}`}>
                          {item.movie.title}
                        </p>
                        <p className="text-xs text-[#888] mt-0.5">
                          {item.movie.releaseDate?.slice(0, 4)}
                          {item.movie.voteAverage > 0 && (
                            <> · <span className="text-[#ff2d55]">{item.movie.voteAverage.toFixed(1)}</span></>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-[#888] ml-auto shrink-0 tabular-nums">
                        {Math.round(item.eloScore)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Watchlist */}
          <TabsContent value="watchlist">
            {loadingWatchlist ? (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3] rounded-sm" />
                ))}
              </div>
            ) : watchlist.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-[#888]">Your watchlist is empty</p>
                <p className="text-xs text-[#888] mt-1">
                  <Link href="/discover" className="text-[#e8e8e8] underline">
                    Discover movies
                  </Link>{" "}
                  and swipe right to add them
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
                {watchlist.map((item) => {
                  const poster = getPosterUrl(item.movie.posterPath, "medium");
                  return (
                    <Link
                      key={item.id}
                      href={`/movie/${item.movie.id}`}
                      className="relative block group"
                    >
                      {poster ? (
                        <Image
                          src={poster}
                          alt={item.movie.title}
                          width={200}
                          height={300}
                          className="aspect-[2/3] w-full rounded-sm object-cover group-hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="aspect-[2/3] rounded-sm bg-[#111]" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-6 pb-1.5 px-1.5 rounded-b-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <p className="text-[11px] text-white leading-tight truncate">
                          {item.movie.title}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Watched */}
          <TabsContent value="watched">
            {loadingWatched ? (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3] rounded-sm" />
                ))}
              </div>
            ) : watched.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-[#888]">No movies logged</p>
                <p className="text-xs text-[#888] mt-1">
                  Find a movie and tap{" "}
                  <span className="text-[#ff2d55]">Log watched</span> to track it
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
                {watched.map((item) => {
                  const movie = item.movie;
                  const poster = movie ? getPosterUrl(movie.posterPath, "medium") : null;
                  return (
                    <Link
                      key={item.id}
                      href={`/movie/${item.movieId}`}
                      className="relative block group"
                    >
                      {poster ? (
                        <Image
                          src={poster}
                          alt={movie?.title ?? "Movie"}
                          width={200}
                          height={300}
                          className="aspect-[2/3] w-full rounded-sm object-cover group-hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="aspect-[2/3] rounded-sm bg-[#111]" />
                      )}
                      {item.rating != null && (
                        <span className="absolute top-1 right-1 bg-black/70 text-[11px] text-[#ff2d55] font-medium px-1.5 py-0.5 rounded-sm tabular-nums">
                          {item.rating}
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-6 pb-1.5 px-1.5 rounded-b-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <p className="text-[11px] text-white leading-tight truncate">
                          {movie?.title}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
