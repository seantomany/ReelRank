"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { getPosterUrl } from "@reelrank/shared";
import type {
  SoloRanking,
  SoloInsights,
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
import { BarChart3, ChevronRight } from "lucide-react";

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
  const [username, setUsername] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [watchlist, setWatchlist] = useState<(SoloSwipe & { movie: Movie })[]>([]);
  const [watched, setWatched] = useState<(WatchedMovie & { movie?: Movie })[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [loadingWatched, setLoadingWatched] = useState(true);
  const [insights, setInsights] = useState<SoloInsights | null>(null);

  useEffect(() => {
    api.auth.verify().then((res) => {
      if (res.data?.username) setUsername(res.data.username);
    });
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

    api.solo.insights().then((res) => {
      if (res.data) setInsights(res.data);
    });
  }, []);

  const displayName = username || (user?.email ? user.email.split("@")[0] : "User");
  const initial = displayName.charAt(0).toUpperCase();

  const handleSaveUsername = async () => {
    if (!username.trim() || username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    setSavingUsername(true);
    const res = await api.auth.updateProfile({ username: username.trim() });
    if (res.data) {
      toast.success("Username updated");
      setEditingUsername(false);
    } else if (res.error) {
      toast.error(res.error);
    }
    setSavingUsername(false);
  };

  const [watchlistSort, setWatchlistSort] = useState<"recent" | "alpha" | "genre">("recent");
  const [watchedSort, setWatchedSort] = useState<"recent" | "rating" | "alpha" | "genre">("recent");

  const GENRE_MAP: Record<number, string> = {};
  [...watchlist, ...watched].forEach((item) => {
    const movie = "movie" in item ? item.movie : undefined;
    if (movie && "genreIds" in movie) {
      for (const gid of (movie as Movie).genreIds) {
        if (!GENRE_MAP[gid]) {
          const match = insights?.genreBreakdown.find((g) => g.genreId === gid);
          if (match) GENRE_MAP[gid] = match.genreName;
        }
      }
    }
  });

  const sortedWatchlist = [...watchlist].sort((a, b) => {
    if (watchlistSort === "alpha") return a.movie.title.localeCompare(b.movie.title);
    if (watchlistSort === "genre") {
      const ga = a.movie.genreIds[0] ?? 999;
      const gb = b.movie.genreIds[0] ?? 999;
      return ga - gb || a.movie.title.localeCompare(b.movie.title);
    }
    return 0;
  });

  const sortedWatched = [...watched].sort((a, b) => {
    if (watchedSort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    if (watchedSort === "alpha") return (a.movie?.title ?? "").localeCompare(b.movie?.title ?? "");
    if (watchedSort === "genre") {
      const ga = a.movie?.genreIds?.[0] ?? 999;
      const gb = b.movie?.genreIds?.[0] ?? 999;
      return ga - gb || (a.movie?.title ?? "").localeCompare(b.movie?.title ?? "");
    }
    return 0;
  });

  const rankCount = rankings.length;
  const watchlistCount = watchlist.length;
  const watchedCount = watched.length;
  const topGenres = insights?.genreBreakdown.slice(0, 3) ?? [];
  const top5 = rankings.slice(0, 5);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#111] border border-[rgba(255,255,255,0.06)]">
          <span className="text-lg font-semibold text-[#888]">{initial}</span>
        </div>
        <div className="min-w-0 flex-1">
          {editingUsername ? (
            <div className="flex items-center gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                maxLength={20}
                className="bg-transparent border-b border-[rgba(255,255,255,0.1)] text-lg font-semibold text-[#e8e8e8] outline-none w-40"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveUsername(); if (e.key === "Escape") setEditingUsername(false); }}
              />
              <button onClick={handleSaveUsername} disabled={savingUsername} className="text-xs text-[#ff2d55] hover:text-[#e8e8e8] transition-colors">
                {savingUsername ? "..." : "Save"}
              </button>
              <button onClick={() => setEditingUsername(false)} className="text-xs text-[#888] hover:text-[#e8e8e8] transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-[#e8e8e8] truncate">
                {displayName}
              </p>
              <button onClick={() => setEditingUsername(true)} className="text-xs text-[#888] hover:text-[#e8e8e8] transition-colors">
                {username ? "edit" : "set username"}
              </button>
            </div>
          )}
          {topGenres.length > 0 && (
            <div className="flex gap-1.5 mt-1">
              {topGenres.map((g) => (
                <span key={g.genreId} className="text-[10px] text-[#888] bg-[#111] rounded-full px-2 py-0.5">
                  {g.genreName}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))
        ) : (
          <>
            <div className="bg-[#111] rounded-lg p-3 text-center">
              <p className="text-xl font-semibold text-[#e8e8e8] tabular-nums">{rankCount}</p>
              <p className="text-[10px] text-[#888] mt-0.5">Ranked</p>
            </div>
            <div className="bg-[#111] rounded-lg p-3 text-center">
              <p className="text-xl font-semibold text-[#e8e8e8] tabular-nums">{watchedCount}</p>
              <p className="text-[10px] text-[#888] mt-0.5">Watched</p>
            </div>
            <div className="bg-[#111] rounded-lg p-3 text-center">
              <p className="text-xl font-semibold text-[#e8e8e8] tabular-nums">{watchlistCount}</p>
              <p className="text-[10px] text-[#888] mt-0.5">Watchlist</p>
            </div>
            <div className="bg-[#111] rounded-lg p-3 text-center">
              <p className="text-xl font-semibold text-[#ff2d55] tabular-nums">
                {insights?.averageRating ? insights.averageRating.toFixed(1) : "—"}
              </p>
              <p className="text-[10px] text-[#888] mt-0.5">Avg Rating</p>
            </div>
          </>
        )}
      </div>

      {/* View Stats link */}
      <Link
        href="/stats"
        className="mt-4 flex items-center justify-between rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)] px-4 py-3 group hover:border-[rgba(255,255,255,0.12)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-[#ff2d55]" />
          <div>
            <p className="text-sm text-[#e8e8e8] font-medium">Your Stats</p>
            <p className="text-[11px] text-[#888]">
              {insights?.moviePersonality.title
                ? `${insights.moviePersonality.title} — view full breakdown`
                : "Genre taste, watch habits, and more"}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#888] group-hover:text-[#e8e8e8] transition-colors" />
      </Link>

      {/* Top 5 showcase */}
      {top5.length > 0 && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-[#888]">Top Ranked</p>
            {rankings.length > 5 && (
              <button onClick={() => setTab("rankings")} className="text-[10px] text-[#888] hover:text-[#e8e8e8] transition-colors">
                See all {rankings.length}
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {top5.map((item) => {
              const poster = getPosterUrl(item.movie.posterPath, "medium");
              return (
                <Link
                  key={item.movieId}
                  href={`/movie/${item.movieId}`}
                  className="shrink-0 w-[100px] group"
                >
                  <div className="relative aspect-[2/3] rounded-sm overflow-hidden">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={item.movie.title}
                        width={100}
                        height={150}
                        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#111]" />
                    )}
                    <span className="absolute top-1 left-1 bg-black/70 text-[10px] text-[#ff2d55] font-semibold px-1.5 py-0.5 rounded-sm tabular-nums">
                      #{item.rank}
                    </span>
                    <span className="absolute bottom-1 right-1 bg-black/70 text-[10px] text-[#e8e8e8] font-medium px-1.5 py-0.5 rounded-sm tabular-nums">
                      {item.beliScore.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#e8e8e8] mt-1 truncate">{item.movie.title}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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
                  <Link href="/discover" className="text-[#e8e8e8] underline">
                    Discover movies
                  </Link>
                  {", watch them, and rank to build your list"}
                </p>
              </div>
            ) : (
              <div>
                {rankings.map((item) => {
                  const poster = getPosterUrl(item.movie.posterPath, "small");
                  const isTop3 = item.rank <= 3;
                  const rankLabel =
                    item.rank === 1 ? "\u{1F947}" : item.rank === 2 ? "\u{1F948}" : item.rank === 3 ? "\u{1F949}" : String(item.rank);

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
                      <span className="text-sm text-[#ff2d55] ml-auto shrink-0 tabular-nums font-medium">
                        {item.beliScore.toFixed(1)}
                      </span>
                    </Link>
                  );
                })}
                <div className="mt-4 text-center">
                  <Link
                    href="/this-or-that"
                    className="text-xs text-[#888] hover:text-[#e8e8e8] transition-colors underline underline-offset-2"
                  >
                    Refine your rankings
                  </Link>
                </div>
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
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-[#888] uppercase tracking-wider">Sort</span>
                  <SortPill active={watchlistSort === "recent"} onClick={() => setWatchlistSort("recent")}>Recent</SortPill>
                  <SortPill active={watchlistSort === "alpha"} onClick={() => setWatchlistSort("alpha")}>A–Z</SortPill>
                  <SortPill active={watchlistSort === "genre"} onClick={() => setWatchlistSort("genre")}>Genre</SortPill>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
                  {sortedWatchlist.map((item) => {
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
              </>
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
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-[#888] uppercase tracking-wider">Sort</span>
                  <SortPill active={watchedSort === "recent"} onClick={() => setWatchedSort("recent")}>Recent</SortPill>
                  <SortPill active={watchedSort === "rating"} onClick={() => setWatchedSort("rating")}>Rating</SortPill>
                  <SortPill active={watchedSort === "alpha"} onClick={() => setWatchedSort("alpha")}>A–Z</SortPill>
                  <SortPill active={watchedSort === "genre"} onClick={() => setWatchedSort("genre")}>Genre</SortPill>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
                  {sortedWatched.map((item) => {
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
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SortPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-0.5 text-[11px] transition-colors ${
        active ? "bg-[#111] text-[#e8e8e8] font-medium" : "text-[#888] hover:text-[#aaa]"
      }`}
    >
      {children}
    </button>
  );
}
