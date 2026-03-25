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
import { X, Check, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RankFlowModal } from "@/components/rank-flow-modal";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Movie } from "@reelrank/shared";
import { getPosterUrl } from "@reelrank/shared";

const VENUES = ["Theater", "Home", "Friend's", "Outdoor", "Other"] as const;
const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface Genre {
  id: number;
  name: string;
}

const ALL_GENRE_ID = -1;
const LOW_DECK_THRESHOLD = 3;
const SWIPE_THRESHOLD = 100;
const DRAG_ROTATION_FACTOR = 12;
const STORAGE_KEY = "reelrank:discover:page:";
const MAX_SKIP_PAGES = 5;

function getSavedPage(genreId: number): number {
  try {
    const val = sessionStorage.getItem(STORAGE_KEY + genreId);
    return val ? Math.max(1, parseInt(val, 10)) : 1;
  } catch {
    return 1;
  }
}

function savePage(genreId: number, page: number) {
  try { sessionStorage.setItem(STORAGE_KEY + genreId, String(page)); } catch {}
}

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
  const [swipedIdsReady, setSwipedIdsReady] = useState(false);
  const fetchingRef = useRef(false);
  const swipedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    api.movies.genres().then((res) => {
      if (res.data) setGenres(res.data);
      else if (res.error) toast.error(res.error);
      setLoadingGenres(false);
    });
    api.solo.swipedIds().then((res) => {
      if (res.data) swipedIdsRef.current = new Set(res.data);
      setSwipedIdsReady(true);
    });
  }, []);

  const fetchMovies = useCallback(
    async (genreId: number, pageNum: number, replace = false): Promise<number> => {
      if (fetchingRef.current) return 0;
      fetchingRef.current = true;
      if (replace) setLoading(true);

      const res =
        genreId === ALL_GENRE_ID
          ? await api.movies.trending(pageNum)
          : await api.movies.discover(genreId, pageNum);

      let newCount = 0;
      if (res.data) {
        setTotalPages(res.data.totalPages);
        const filtered = res.data.movies.filter((m) => !swipedIdsRef.current.has(m.id));
        newCount = filtered.length;
        setDeck((prev) => replace ? filtered : [...prev, ...filtered]);
      } else if (res.error) {
        toast.error(res.error);
      }

      setLoading(false);
      fetchingRef.current = false;
      return newCount;
    },
    []
  );

  const loadInitialDeck = useCallback(
    async (genreId: number) => {
      setDeck([]);
      setLoading(true);

      let startPage = getSavedPage(genreId);
      let skipped = 0;

      while (skipped < MAX_SKIP_PAGES) {
        const count = await fetchMovies(genreId, startPage, true);
        if (count > 0) break;
        skipped++;
        startPage++;
      }

      setPage(startPage);
      savePage(genreId, startPage);
      setLoading(false);
    },
    [fetchMovies]
  );

  useEffect(() => {
    if (!swipedIdsReady) return;
    loadInitialDeck(activeGenre);
  }, [activeGenre, swipedIdsReady, loadInitialDeck]);

  useEffect(() => {
    if (
      deck.length > 0 &&
      deck.length < LOW_DECK_THRESHOLD &&
      page < totalPages &&
      !fetchingRef.current
    ) {
      const next = page + 1;
      setPage(next);
      savePage(activeGenre, next);
      fetchMovies(activeGenre, next);
    }
  }, [deck.length, page, totalPages, activeGenre, fetchMovies]);

  const [exitDir, setExitDir] = useState<"left" | "right">("right");

  // Watched / log flow state
  const [logMovie, setLogMovie] = useState<Movie | null>(null);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [showRankFlow, setShowRankFlow] = useState(false);
  const [logRating, setLogRating] = useState(7);
  const [logVenue, setLogVenue] = useState<(typeof VENUES)[number]>("Home");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logNotes, setLogNotes] = useState("");
  const [logSubmitting, setLogSubmitting] = useState(false);

  const handleWatched = useCallback(() => {
    if (swiping || deck.length === 0 || showLogSheet || showRankFlow) return;
    setLogMovie(deck[0]);
    setLogRating(7);
    setLogVenue("Home");
    setLogDate(new Date().toISOString().slice(0, 10));
    setLogNotes("");
    setShowLogSheet(true);
  }, [swiping, deck, showLogSheet, showRankFlow]);

  const handleLogSubmit = useCallback(async () => {
    if (!logMovie || logSubmitting) return;
    setLogSubmitting(true);
    const res = await api.solo.logWatched({
      movieId: logMovie.id,
      rating: logRating,
      watchedAt: logDate,
      venue: logVenue,
      notes: logNotes.trim() || undefined,
    });
    setLogSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Logged ${logMovie.title} — ${logRating}/10`);
    setShowLogSheet(false);
    setShowRankFlow(true);
  }, [logMovie, logSubmitting, logRating, logDate, logVenue, logNotes]);

  const dismissLogMovie = useCallback(() => {
    if (logMovie) {
      swipedIdsRef.current.add(logMovie.id);
      setDeck((prev) => prev.filter((m) => m.id !== logMovie.id));
    }
    setLogMovie(null);
    setShowLogSheet(false);
    setShowRankFlow(false);
  }, [logMovie]);

  const handleSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (swiping || deck.length === 0) return;
      setExitDir(direction);
      setSwiping(true);

      const movie = deck[0];
      const res = await api.solo.swipe(movie.id, direction);
      if (res.error) {
        toast.error(res.error);
        setSwiping(false);
        return;
      }
      if (direction === "right") {
        toast.success(`${movie.title} added to watchlist`);
      }

      swipedIdsRef.current.add(movie.id);
      setDeck((prev) => prev.slice(1));
      setSwiping(false);
    },
    [swiping, deck]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showLogSheet || showRankFlow) return;
      if (e.key === "ArrowLeft") handleSwipe("left");
      else if (e.key === "ArrowRight") handleSwipe("right");
      else if (e.key === "ArrowDown") { e.preventDefault(); handleWatched(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSwipe, handleWatched, showLogSheet, showRankFlow]);

  const handleGenreChange = (genreId: number) => {
    if (genreId === activeGenre) return;
    setActiveGenre(genreId);
  };

  const handleReset = () => {
    savePage(activeGenre, 1);
    setPage(1);
    setTotalPages(1);
    fetchMovies(activeGenre, 1, true);
  };

  const isEmpty = !loading && deck.length === 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)] px-4">
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
        <div className="mt-6 flex items-center gap-6">
          <button
            onClick={() => handleSwipe("left")}
            disabled={swiping || showLogSheet || showRankFlow}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] text-[#888] transition-colors hover:text-red-400 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={handleWatched}
            disabled={swiping || showLogSheet || showRankFlow}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] text-[#888] transition-colors hover:text-[#30d5c8] disabled:opacity-40"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleSwipe("right")}
            disabled={swiping || showLogSheet || showRankFlow}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] text-[#888] transition-colors hover:text-[#ff2d55] disabled:opacity-40"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Keyboard hint — desktop only */}
      {!loading && !isEmpty && (
        <p className="mt-3 hidden text-xs text-[#888] md:block">
          ← Pass · ↓ Watched · Want →
        </p>
      )}

      {/* Log watched sheet */}
      <AnimatePresence>
        {showLogSheet && logMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 px-4"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-sm rounded-t-2xl md:rounded-2xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] p-5 pb-8 md:pb-5 space-y-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#e8e8e8] truncate pr-4">{logMovie.title}</p>
                <button
                  onClick={() => { setShowLogSheet(false); setLogMovie(null); }}
                  className="text-xs text-[#888] hover:text-[#aaa] transition-colors shrink-0"
                >
                  Cancel
                </button>
              </div>

              {/* Rating */}
              <div>
                <motion.p
                  key={logRating}
                  initial={{ scale: 1.15, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="text-4xl font-semibold text-[#ff2d55] tabular-nums text-center"
                >
                  {logRating}
                </motion.p>
                <div className="flex justify-between mt-3 px-1">
                  {RATINGS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLogRating(n)}
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all cursor-pointer ${
                        n === logRating
                          ? "bg-[#ff2d55] text-white font-semibold"
                          : n <= logRating
                            ? "text-[#ff2d55]"
                            : "text-[#888]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#888]">Where</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {VENUES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setLogVenue(v)}
                      className={`rounded-full text-xs px-2.5 py-1 transition-colors cursor-pointer ${
                        logVenue === v
                          ? "bg-[#111] text-[#e8e8e8]"
                          : "text-[#888] hover:text-[#aaa]"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#888]">When</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="mt-1.5 block w-full bg-[#111] rounded-md text-sm text-[#e8e8e8] px-3 py-2 border-0 outline-none"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#888]">Notes</label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Optional"
                  className="mt-1.5 block w-full bg-[#111] rounded-md text-sm text-[#e8e8e8] px-3 py-2 border-0 outline-none resize-none placeholder:text-[#555]"
                />
              </div>

              <Button onClick={handleLogSubmit} disabled={logSubmitting} className="w-full">
                {logSubmitting ? "Saving…" : "Save & Rank"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rank flow after logging */}
      {showRankFlow && logMovie && (
        <RankFlowModal
          movie={logMovie}
          open
          rating={logRating}
          onClose={dismissLogMovie}
          onSkip={dismissLogMovie}
        />
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
  const scale = useTransform(x, [-300, 0, 300], [1.02, 1, 1.02]);
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
        scale: isTop ? scale : 1,
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
        rotate: exitDir === "right" ? 15 : -15,
        transition: { duration: 0.25, ease: "easeIn" },
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
