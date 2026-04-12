"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { X, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { subscribeToRoom } from "@/lib/ably";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ABLY_EVENTS, getPosterUrl } from "@reelrank/shared";
import type { Movie } from "@reelrank/shared";

const SWIPE_THRESHOLD = 100;
const DRAG_ROTATION_FACTOR = 15;

export default function GroupSwipePage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = React.use(props.params as Promise<{ code: string }>);
  const router = useRouter();
  const { user } = useAuth();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exitDir, setExitDir] = useState<"left" | "right">("right");
  const [doneMembers, setDoneMembers] = useState<Set<string>>(new Set());
  const [totalMembers, setTotalMembers] = useState(0);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [memberProgress, setMemberProgress] = useState<Record<string, number>>({});

  const total = movies.length;
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;
  const allDone = currentIndex >= total && total > 0;

  useEffect(() => {
    api.rooms.get(code).then((res) => {
      if (res.data) {
        if (res.data.status === "results") {
          router.push(`/group/${code}/results`);
          return;
        }
        if (res.data.status === "lobby") {
          router.push(`/group/${code}`);
          return;
        }
        if (res.data.status === "submitting") {
          router.push(`/group/${code}/submit`);
          return;
        }
        const list = (res.data.movies ?? [])
          .map((rm) => rm.movie)
          .filter(Boolean) as Movie[];
        setMovies(list);
        const members = res.data.members ?? [];
        setTotalMembers(members.length);
        const names: Record<string, string> = {};
        const done = new Set<string>();
        const progress: Record<string, number> = {};
        for (const m of members) {
          const md = m as unknown as Record<string, unknown>;
          names[m.userId] = (m.user?.displayName || m.user?.username || "Member") as string;
          if (md.doneAt) done.add(m.userId);
          if (typeof md.swipeCount === "number") {
            progress[m.userId] = md.swipeCount;
          }
        }
        setMemberNames(names);
        setDoneMembers(done);
        setMemberProgress(progress);
      } else if (res.error) {
        toast.error(res.error);
      }
      setLoading(false);
    });
  }, [code, router, user?.uid]);

  useEffect(() => {
    const unsubscribe = subscribeToRoom(code, {
      [ABLY_EVENTS.SWIPE_PROGRESS]: (data: unknown) => {
        const payload = data as {
          userId?: string;
          userSwipeCount?: number;
          totalMovies?: number;
        };
        if (payload.userId && typeof payload.userSwipeCount === "number") {
          setMemberProgress((prev) => ({
            ...prev,
            [payload.userId!]: payload.userSwipeCount!,
          }));
        }
      },
      [ABLY_EVENTS.MEMBER_DONE]: (data: unknown) => {
        const payload = data as { userId?: string };
        if (payload.userId) {
          setDoneMembers((prev) => new Set(prev).add(payload.userId!));
        }
      },
      [ABLY_EVENTS.RESULTS_READY]: () => {
        router.push(`/group/${code}/results`);
      },
      [ABLY_EVENTS.ROOM_STATUS]: (data: unknown) => {
        const payload = data as { status?: string };
        if (payload.status === "results") {
          router.push(`/group/${code}/results`);
        }
      },
    });
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [code, router]);

  // Poll room data as fallback (Ably is primary)
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await api.rooms.get(code);
        if (cancelled || !res.data) return;

        if (res.data.status === "results") {
          router.push(`/group/${code}/results`);
          return;
        }

        const members = res.data.members ?? [];
        const done = new Set<string>();
        const progress: Record<string, number> = {};
        const names: Record<string, string> = {};

        for (const m of members) {
          const md = m as unknown as Record<string, unknown>;
          names[m.userId] = (m.user?.displayName || m.user?.username || "Member") as string;
          if (md.doneAt) done.add(m.userId);
          if (typeof md.swipeCount === "number") {
            progress[m.userId] = md.swipeCount;
          }
        }

        setDoneMembers(done);
        setMemberProgress(progress);
        setMemberNames((prev) => ({ ...prev, ...names }));
        if (members.length > 0) setTotalMembers(members.length);
      } catch {
        // polling failure is not critical
      }
    };

    poll();
    const interval = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [code, router]);

  const handleSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (swiping || currentIndex >= movies.length) return;

      setExitDir(direction);
      setSwiping(true);

      const movie = movies[currentIndex];
      const res = await api.rooms.swipe(code, movie.id, direction);

      if (res.error) {
        toast.error(res.error);
        setSwiping(false);
        return;
      }
      if (res.data?.allDone) {
        router.push(`/group/${code}/results`);
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setSwiping(false);
    },
    [swiping, currentIndex, movies, code, router]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") handleSwipe("left");
      else if (e.key === "ArrowRight") handleSwipe("right");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSwipe]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Skeleton className="aspect-[2/3] w-[280px] md:w-[320px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pt-4 pb-12">
      {/* Progress bar */}
      <div className="mb-2 w-full max-w-lg">
        <div className="h-0.5 w-full overflow-hidden bg-[#111]">
          <motion.div
            className="h-full bg-[#ff2d55]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Progress text */}
      <p className="mb-4 text-xs text-[#888] tabular-nums">
        {allDone ? `${total} of ${total}` : `${currentIndex} of ${total}`} swiped
      </p>

      {allDone ? (
        <WaitingForOthers
          code={code}
          doneMembers={doneMembers}
          totalMembers={totalMembers}
          memberNames={memberNames}
          memberProgress={memberProgress}
          totalMovies={total}
          currentUserId={user?.uid}
          router={router}
        />
      ) : (
        <>
          <div className="relative w-[280px] md:w-[320px] aspect-[2/3]">
            <AnimatePresence>
              {movies
                .slice(currentIndex, currentIndex + 2)
                .map((movie, i) => (
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
          </div>

          <div className="mt-6 flex items-center gap-5">
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

          <p className="mt-3 hidden text-xs text-[#888] md:block">
            ← Pass · Want →
          </p>
        </>
      )}
    </div>
  );
}

function WaitingForOthers({
  code,
  doneMembers,
  totalMembers,
  memberNames,
  memberProgress,
  totalMovies,
  currentUserId,
  router,
}: {
  code: string;
  doneMembers: Set<string>;
  totalMembers: number;
  memberNames: Record<string, string>;
  memberProgress: Record<string, number>;
  totalMovies: number;
  currentUserId?: string;
  router: ReturnType<typeof import("next/navigation").useRouter>;
}) {
  const selfIncluded = currentUserId ? doneMembers.has(currentUserId) : true;
  const doneCount = selfIncluded
    ? doneMembers.size
    : Math.min(doneMembers.size + 1, totalMembers);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

  const tryFetchResults = useCallback(async () => {
    setLoadingResults(true);
    setResultError(null);
    const res = await api.rooms.results(code);
    if (res.data) {
      router.push(`/group/${code}/results`);
    } else {
      setLoadingResults(false);
      setResultError(res.error ?? "Results not ready yet");
    }
  }, [code, router]);

  // Auto-retry fetching results every 5s once all members are detected as done
  useEffect(() => {
    if (doneCount >= totalMembers && totalMembers > 0) {
      tryFetchResults();
      const interval = setInterval(() => tryFetchResults(), 5000);
      return () => clearInterval(interval);
    }
  }, [doneCount, totalMembers, tryFetchResults]);

  const everyoneDone = doneCount >= totalMembers && totalMembers > 0;
  const allMemberIds = Object.keys(memberNames);

  return (
    <div className="flex flex-col items-center py-12 gap-6 w-full max-w-sm mx-auto">
      {everyoneDone ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#ff2d55] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#888]">Computing results...</p>
          {resultError && (
            <p className="text-[10px] text-[#555]">{resultError}</p>
          )}
          <button
            onClick={tryFetchResults}
            disabled={loadingResults}
            className="mt-1 px-4 py-2 rounded-lg bg-[#ff2d55] text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loadingResults ? "Loading..." : "View Results"}
          </button>
        </div>
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm text-[#888]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff2d55] animate-pulse" />
            Waiting for others to finish
          </p>
          {totalMembers > 0 && (
            <p className="text-xs text-[#555] tabular-nums">
              {doneCount}/{totalMembers} done
            </p>
          )}
        </>
      )}

      {allMemberIds.length > 0 && (
        <div className="w-full mt-2 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-[#888]">
            Member Progress
          </p>
          {allMemberIds.map((uid) => {
            const isDone = doneMembers.has(uid);
            const swiped = memberProgress[uid] ?? (isDone ? totalMovies : 0);
            const pct = totalMovies > 0 ? Math.min((swiped / totalMovies) * 100, 100) : 0;
            return (
              <div key={uid} className="flex items-center gap-3">
                <span className="text-xs text-[#e8e8e8] w-24 truncate">
                  {memberNames[uid]}
                </span>
                <div className="flex-1 h-1.5 bg-[#111] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isDone ? "#34c759" : "#ff2d55",
                    }}
                  />
                </div>
                <span className="text-[10px] text-[#888] tabular-nums w-12 text-right">
                  {isDone ? "Done" : `${swiped}/${totalMovies}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const wantOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const poster = getPosterUrl(movie.posterPath, "large");
  const year = movie.releaseDate?.split("-")[0] ?? "";
  const rating = movie.voteAverage > 0 ? movie.voteAverage.toFixed(1) : null;

  function handleDragEnd() {
    if (disabled) return;
    const currentX = x.get();
    if (currentX > SWIPE_THRESHOLD) onSwipe("right");
    else if (currentX < -SWIPE_THRESHOLD) onSwipe("left");
  }

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
