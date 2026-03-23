"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useSearchParams } from "next/navigation";
import { X, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Movie } from "@reelrank/shared";
import { getPosterUrl, SWIPE_DECK_PRELOAD } from "@reelrank/shared";

interface Genre {
  id: number;
  name: string;
}

const ALL_GENRE_ID = -1;
const LOW_DECK_THRESHOLD = 3;
const SWIPE_THRESHOLD = 100;
const DRAG_ROTATION_FACTOR = 15;

export default function DiscoverPage() {
  const searchParams = useSearchParams();
  const initialGenre = searchParams.get("genre");

  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeGenre, setActiveGenre] = useState<number>(
    initialGenre ? Number(initialGenre) : ALL_GENRE_ID
  );
  const [deck, setDeck] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    api.movies.genres().then((res) => {
      if (res.data) setGenres(res.data);
      else if (res.error) toast.error(res.error);
      setLoadingGenres(false);
    });
  }, []);

  const fetchMovies = useCallback(
    async (genreId: number, pageNum: number, replace = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      if (replace) setLoading(true);

      const res =
        genreId === ALL_GENRE_ID
          ? await api.movies.trending(pageNum)
          : await api.movies.discover(genreId, pageNum);

      if (res.data) {
        setTotalPages(res.data.totalPages);
        setDeck((prev) =>
          replace ? res.data!.movies : [...prev, ...res.data!.movies]
        );
      } else if (res.error) {
        toast.error(res.error);
      }

      setLoading(false);
      fetchingRef.current = false;
    },
    []
  );

  useEffect(() => {
    setDeck([]);
    setPage(1);
    setTotalPages(1);
    fetchMovies(activeGenre, 1, true);
  }, [activeGenre, fetchMovies]);

  useEffect(() => {
    if (
      deck.length > 0 &&
      deck.length < LOW_DECK_THRESHOLD &&
      page < totalPages &&
      !fetchingRef.current
    ) {
      const next = page + 1;
      setPage(next);
      fetchMovies(activeGenre, next);
    }
  }, [deck.length, page, totalPages, activeGenre, fetchMovies]);

  const [exitDir, setExitDir] = useState<"left" | "right">("right");

  const handleSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (swiping || deck.length === 0) return;
      setExitDir(direction);
      setSwiping(true);

      const movie = deck[0];
      const res = await api.solo.swipe(movie.id, direction);
      if (res.error) {
        toast.error(res.error);
      } else if (direction === "right") {
        toast.success(`${movie.title} added to watchlist`);
      }

      setDeck((prev) => prev.slice(1));
      setSwiping(false);
    },
    [swiping, deck]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleSwipe("left");
      else if (e.key === "ArrowRight") handleSwipe("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSwipe]);

  const handleGenreChange = (genreId: number) => {
    if (genreId === activeGenre) return;
    setActiveGenre(genreId);
  };

  const handleReset = () => {
    setPage(1);
    setTotalPages(1);
    fetchMovies(activeGenre, 1, true);
  };

  const isEmpty = !loading && deck.length === 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      {/* Genre filter chips */}
      <div className="w-full max-w-lg mb-6 -mx-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 px-4 pb-2">
          {loadingGenres ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-16 shrink-0 rounded-full" />
            ))
          ) : (
            <>
              <button
                onClick={() => handleGenreChange(ALL_GENRE_ID)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                  activeGenre === ALL_GENRE_ID
                    ? "bg-[#111] text-[#e8e8e8] font-medium"
                    : "text-[#888]"
                }`}
              >
                All
              </button>
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => handleGenreChange(genre.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                    activeGenre === genre.id
                      ? "bg-[#111] text-[#e8e8e8] font-medium"
                      : "text-[#888]"
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Swipe card stack */}
      <div className="relative w-[280px] md:w-[320px] aspect-[2/3]">
        {loading ? (
          <Skeleton className="h-full w-full rounded-sm" />
        ) : isEmpty ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <p className="text-sm text-[#888]">No more movies</p>
            <button
              onClick={handleReset}
              className="text-sm text-[#888] underline underline-offset-2 hover:text-[#e8e8e8] transition-colors"
            >
              Reset
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {deck.slice(0, 2).map((movie, i) => (
              <SwipeCard
                key={movie.id}
                movie={movie}
                index={i}
                isTop={i === 0}
                onSwipe={handleSwipe}
                disabled={swiping}
                exitDir={exitDir}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Controls */}
      {!loading && !isEmpty && (
        <div className="mt-6 flex items-center gap-8">
          <button
            onClick={() => handleSwipe("left")}
            disabled={swiping}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] text-[#888] transition-colors hover:text-red-400 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleSwipe("right")}
            disabled={swiping}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] text-[#888] transition-colors hover:text-[#ff2d55] disabled:opacity-40"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Keyboard hint — desktop only */}
      {!loading && !isEmpty && (
        <p className="mt-3 hidden text-xs text-[#888] md:block">
          ← Pass · Want →
        </p>
      )}
    </div>
  );
}

/* ─── Swipe Card ─── */

function SwipeCard({
  movie,
  index,
  isTop,
  onSwipe,
  disabled,
  exitDir,
}: {
  movie: Movie;
  index: number;
  isTop: boolean;
  onSwipe: (dir: "left" | "right") => void;
  disabled: boolean;
  exitDir: "left" | "right";
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(
    x,
    [-300, 0, 300],
    [-DRAG_ROTATION_FACTOR, 0, DRAG_ROTATION_FACTOR]
  );
  const wantOpacity = useTransform(x, [0, 80], [0, 1]);
  const passOpacity = useTransform(x, [-80, 0], [1, 0]);

  const poster = getPosterUrl(movie.posterPath, "large");
  const year = movie.releaseDate?.split("-")[0] ?? "";
  const rating = movie.voteAverage > 0 ? movie.voteAverage.toFixed(1) : null;

  const handleDragEnd = () => {
    if (disabled) return;
    const cx = x.get();
    if (cx > SWIPE_THRESHOLD) onSwipe("right");
    else if (cx < -SWIPE_THRESHOLD) onSwipe("left");
  };

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-sm"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: 2 - index,
        pointerEvents: isTop ? "auto" : "none",
        cursor: isTop ? "grab" : "default",
      }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{
        scale: isTop ? 1 : 0.95,
        y: isTop ? 0 : 8,
        opacity: 1,
      }}
      exit={{
        x: exitDir === "right" ? 400 : -400,
        opacity: 0,
        rotate: exitDir === "right" ? 20 : -20,
        transition: { duration: 0.3 },
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      {poster ? (
        <Image
          src={poster}
          alt={movie.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 280px, 320px"
          priority={index === 0}
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#111] text-sm text-[#888]">
          No poster
        </div>
      )}

      {/* Drag labels */}
      {isTop && (
        <>
          <motion.span
            className="absolute left-4 top-6 text-2xl font-bold uppercase tracking-wider text-[#ff2d55]"
            style={{ opacity: wantOpacity, rotate: -12 }}
          >
            WANT
          </motion.span>
          <motion.span
            className="absolute right-4 top-6 text-2xl font-bold uppercase tracking-wider text-red-400"
            style={{ opacity: passOpacity, rotate: 12 }}
          >
            PASS
          </motion.span>
        </>
      )}

      {/* Bottom gradient with title / year / rating */}
      <div
        className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-20"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
        }}
      >
        <h2 className="text-lg font-semibold text-white">{movie.title}</h2>
        <div className="mt-1 flex items-center gap-2">
          {year && <span className="text-sm text-white/60">{year}</span>}
          {rating && (
            <span className="text-sm text-[#ff2d55]">{rating}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
