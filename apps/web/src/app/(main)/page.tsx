"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import type { Movie, SoloSwipe, WatchedMovie } from "@reelrank/shared";
import { getPosterUrl, getBackdropUrl } from "@reelrank/shared";

interface Stats {
  totalSwipes: number;
  rightSwipes: number;
  leftSwipes: number;
  pairwiseChoices: number;
  moviesWatched: number;
  winRate: number;
}

interface Genre {
  id: number;
  name: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [watchlist, setWatchlist] = useState<(SoloSwipe & { movie: Movie })[]>([]);
  const [watched, setWatched] = useState<(WatchedMovie & { movie?: Movie })[]>([]);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [statsRes, trendingRes, genresRes, watchlistRes, watchedRes, suggestionsRes] = await Promise.all([
          api.solo.stats(),
          api.movies.trending(),
          api.movies.genres(),
          api.solo.lists("want"),
          api.solo.watched(),
          api.solo.suggestions(),
        ]);

        if (!mounted) return;

        if (statsRes.data) setStats(statsRes.data);
        if (trendingRes.data) setTrending(trendingRes.data.movies);
        if (genresRes.data) setGenres(genresRes.data);
        if (watchlistRes.data) setWatchlist(watchlistRes.data);
        if (watchedRes.data) setWatched(watchedRes.data);
        if (suggestionsRes.data) setSuggestions(suggestionsRes.data);
      } catch (err) {
        console.error("Failed to load home data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const username = user?.email?.split("@")[0] ?? "";
  const hero = trending[0] ?? null;
  const rest = trending.slice(1);
  const heroBackdrop = hero ? getBackdropUrl(hero.backdropPath, "large") : null;
  const heroYear = hero?.releaseDate ? new Date(hero.releaseDate).getFullYear() : null;
  const recentWatched = watched.slice(0, 20);

  if (loading) {
    return (
      <div>
        <Skeleton className="w-full aspect-[16/7]" />
        <div className="px-4 md:px-6 mt-6 space-y-4">
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-1 overflow-hidden" style={{ scrollbarWidth: "none" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="w-[100px] md:w-[130px] aspect-[2/3] shrink-0 rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Greeting */}
      <div className="px-4 md:px-6 pt-4 pb-2">
        <p className="text-sm text-[#888]">
          Hey {username}
          {stats && (
            <>
              {" — "}
              {(stats as any).uniqueRanked ?? 0} films ranked · {stats.moviesWatched} watched
            </>
          )}
        </p>
      </div>

      {/* Hero */}
      {hero && heroBackdrop && (
        <Link href={`/movie/${hero.id}`} className="block relative mt-2">
          <div className="relative w-full aspect-[16/9] md:aspect-[16/7]">
            <Image src={heroBackdrop} alt={hero.title} fill priority className="object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom, transparent 40%, #000 100%)" }}
            />
            <div className="absolute bottom-0 left-0 px-4 md:px-6 pb-4">
              <h2 className="text-2xl md:text-4xl font-semibold text-[#e8e8e8]">{hero.title}</h2>
              {heroYear && <p className="text-sm text-[#888] mt-1">{heroYear}</p>}
            </div>
          </div>
        </Link>
      )}

      {/* Trending strip */}
      <section className="mt-6">
        <p className="text-xs uppercase tracking-widest text-[#888] pl-4 md:pl-6 mb-2">Trending</p>
        <div className="flex gap-1 overflow-x-auto pl-4 md:pl-6" style={{ scrollbarWidth: "none" }}>
          {rest.map((movie) => {
            const poster = getPosterUrl(movie.posterPath, "medium");
            return (
              <Link key={movie.id} href={`/movie/${movie.id}`} className="shrink-0 block">
                <div className="w-[100px] md:w-[130px] aspect-[2/3] rounded-sm overflow-hidden">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={movie.title}
                      width={130}
                      height={195}
                      className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#111]" />
                  )}
                </div>
                <p className="text-xs text-[#888] truncate mt-1 w-[100px] md:w-[130px]">{movie.title}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Your Watchlist */}
      {watchlist.length > 0 && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between pl-4 md:pl-6 pr-4 md:pr-6 mb-2">
            <p className="text-xs uppercase tracking-widest text-[#888]">Your Watchlist</p>
            <Link href="/profile" className="text-xs text-[#888] hover:text-[#e8e8e8] transition-colors">
              See all
            </Link>
          </div>
          <div className="flex gap-1 overflow-x-auto pl-4 md:pl-6" style={{ scrollbarWidth: "none" }}>
            {watchlist.slice(0, 20).map((item, idx) => {
              const poster = getPosterUrl(item.movie.posterPath, "medium");
              return (
                <Link key={`${item.id}-${idx}`} href={`/movie/${item.movie.id}`} className="shrink-0 block">
                  <div className="w-[100px] md:w-[130px] aspect-[2/3] rounded-sm overflow-hidden">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={item.movie.title}
                        width={130}
                        height={195}
                        className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#111]" />
                    )}
                  </div>
                  <p className="text-xs text-[#888] truncate mt-1 w-[100px] md:w-[130px]">{item.movie.title}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Suggested For You */}
      {suggestions.length > 0 && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between pl-4 md:pl-6 pr-4 md:pr-6 mb-2">
            <p className="text-xs uppercase tracking-widest text-[#888]">Suggested For You</p>
            <Link href="/discover" className="text-xs text-[#888] hover:text-[#e8e8e8] transition-colors">
              Discover
            </Link>
          </div>
          <div className="flex gap-1 overflow-x-auto pl-4 md:pl-6" style={{ scrollbarWidth: "none" }}>
            {suggestions.map((movie) => {
              const poster = getPosterUrl(movie.posterPath, "medium");
              return (
                <Link key={movie.id} href={`/movie/${movie.id}`} className="shrink-0 block">
                  <div className="w-[100px] md:w-[130px] aspect-[2/3] rounded-sm overflow-hidden">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={movie.title}
                        width={130}
                        height={195}
                        className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#111]" />
                    )}
                  </div>
                  <p className="text-xs text-[#888] truncate mt-1 w-[100px] md:w-[130px]">{movie.title}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recently Watched */}
      {recentWatched.length > 0 && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between pl-4 md:pl-6 pr-4 md:pr-6 mb-2">
            <p className="text-xs uppercase tracking-widest text-[#888]">Recently Watched</p>
            <Link href="/profile" onClick={() => {}} className="text-xs text-[#888] hover:text-[#e8e8e8] transition-colors">
              See all
            </Link>
          </div>
          <div className="flex gap-1 overflow-x-auto pl-4 md:pl-6" style={{ scrollbarWidth: "none" }}>
            {recentWatched.map((item) => {
              const movie = item.movie;
              const poster = movie ? getPosterUrl(movie.posterPath, "medium") : null;
              return (
                <Link key={item.id} href={`/movie/${item.movieId}`} className="shrink-0 block relative">
                  <div className="w-[100px] md:w-[130px] aspect-[2/3] rounded-sm overflow-hidden">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={movie?.title ?? "Movie"}
                        width={130}
                        height={195}
                        className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#111]" />
                    )}
                  </div>
                  {item.rating != null && (
                    <span className="absolute top-1 right-1 bg-black/70 text-[10px] text-[#ff2d55] font-medium px-1 py-0.5 rounded-sm tabular-nums">
                      {item.rating}
                    </span>
                  )}
                  <p className="text-xs text-[#888] truncate mt-1 w-[100px] md:w-[130px]">{movie?.title}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Watchlist empty nudge */}
      {watchlist.length === 0 && !loading && (
        <section className="mt-8 px-4 md:px-6">
          <p className="text-xs uppercase tracking-widest text-[#888] mb-2">Your Watchlist</p>
          <p className="text-sm text-[#888]">
            Nothing here yet.{" "}
            <Link href="/discover" className="text-[#e8e8e8] underline">Start discovering</Link>{" "}
            and swipe right on movies you want to watch.
          </p>
        </section>
      )}

      {/* Genre chips */}
      {genres.length > 0 && (
        <section className="mt-8 pb-8">
          <div className="flex gap-2 overflow-x-auto pl-4 md:pl-6" style={{ scrollbarWidth: "none" }}>
            {genres.map((genre) => (
              <Link
                key={genre.id}
                href={`/discover?genre=${genre.id}`}
                className="shrink-0 rounded-full bg-[#111] text-[#888] text-xs px-3 py-1 hover:text-[#e8e8e8] transition-colors"
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}
