"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { subscribeToRoom } from "@/lib/ably";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ABLY_EVENTS, getPosterUrl } from "@reelrank/shared";
import type { Movie, Room } from "@reelrank/shared";
import { ChevronDown, ChevronUp, Users } from "lucide-react";

export default function SubmitPage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = React.use(props.params as Promise<{ code: string }>);
  const router = useRouter();
  const { user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [pool, setPool] = useState<Movie[]>([]);
  const [poolIds, setPoolIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [movieSubmitters, setMovieSubmitters] = useState<Record<number, string>>({});
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [showDashboard, setShowDashboard] = useState(false);
  const [maxPerMember, setMaxPerMember] = useState<number | null>(null);

  useEffect(() => {
    api.rooms.get(code).then((res) => {
      if (res.data) {
        setRoom(res.data);
        const roomMovies = res.data.movies ?? [];
        const movies = roomMovies.map((rm) => rm.movie).filter(Boolean) as Movie[];
        setPool(movies);
        setPoolIds(new Set(movies.map((m) => m.id)));

        const subs: Record<number, string> = {};
        for (const rm of roomMovies) {
          if (rm.submittedByUserId && rm.movie) {
            subs[rm.movie.id] = rm.submittedByUserId;
          }
        }
        setMovieSubmitters(subs);

        const names: Record<string, string> = {};
        for (const m of res.data.members ?? []) {
          names[m.userId] = m.user?.displayName || m.user?.username || "Member";
        }
        setMemberNames(names);
        if (res.data.maxMoviesPerMember) {
          setMaxPerMember(res.data.maxMoviesPerMember);
        }

        if (res.data.status === "swiping") {
          router.push(`/group/${code}/swipe`);
          return;
        }
        if (res.data.status === "results") {
          router.push(`/group/${code}/results`);
          return;
        }
      } else if (res.error) {
        toast.error(res.error);
      }
      setLoading(false);
    });
  }, [code, router]);

  useEffect(() => {
    const unsubscribe = subscribeToRoom(code, {
      [ABLY_EVENTS.MOVIE_SUBMITTED]: async (data: unknown) => {
        const payload = data as { movieId: number; submittedBy?: string };
        const movieId = payload.movieId;
        if (!movieId) return;

        if (payload.submittedBy) {
          setMovieSubmitters((prev) => ({ ...prev, [movieId]: payload.submittedBy! }));
        }

        setPoolIds((prev) => {
          if (prev.has(movieId)) return prev;
          return new Set(prev).add(movieId);
        });

        const res = await api.movies.get(movieId);
        if (res.data) {
          setPool((prev) => {
            if (prev.some((m) => m.id === movieId)) return prev;
            return [...prev, res.data!];
          });
        }
      },
      [ABLY_EVENTS.ROOM_STATUS]: (data: unknown) => {
        const payload = data as { status?: string };
        if (payload.status === "swiping") {
          router.push(`/group/${code}/swipe`);
        }
      },
    });
    return unsubscribe;
  }, [code, router]);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      api.movies
        .search(value.trim())
        .then((res) => {
          if (res.data) setResults(res.data.movies);
          else if (res.error) toast.error(res.error);
        })
        .finally(() => setSearching(false));
    }, 300);
  }

  async function handleAdd(movie: Movie) {
    if (poolIds.has(movie.id) || atLimit) return;
    setSubmitting(movie.id);
    const res = await api.rooms.submit(code, movie.id);
    if (res.data) {
      setPool((prev) => [...prev, movie]);
      setPoolIds((prev) => new Set(prev).add(movie.id));
      if (user?.uid) {
        setMovieSubmitters((prev) => ({ ...prev, [movie.id]: user.uid }));
      }
    } else if (res.error) {
      toast.error(res.error);
    }
    setSubmitting(null);
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await api.rooms.get(code);
      if (res.data) {
        if (res.data.status === "swiping") {
          router.push(`/group/${code}/swipe`);
        } else if (res.data.status === "results") {
          router.push(`/group/${code}/results`);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [code, router]);

  async function handleStartSwiping() {
    setStarting(true);
    const res = await api.rooms.start(code, "swiping");
    if (res.error) {
      toast.error(res.error);
      setStarting(false);
    } else {
      router.push(`/group/${code}/swipe`);
    }
  }

  const isHost = room?.hostId === user?.uid;
  const mySubmissionCount = user?.uid
    ? Object.values(movieSubmitters).filter((uid) => uid === user.uid).length
    : 0;
  const atLimit = maxPerMember !== null && mySubmissionCount >= maxPerMember;

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="h-10 w-full animate-pulse rounded-sm bg-[#111]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={atLimit ? "Submission limit reached" : "Add movies"}
        autoFocus
        disabled={atLimit}
        className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.06)] pb-3 text-lg text-[#e8e8e8] placeholder:text-[#555] outline-none disabled:opacity-40"
      />
      {maxPerMember !== null && (
        <p className="mt-1 text-[10px] text-[#888] tabular-nums">
          {mySubmissionCount}/{maxPerMember} movies added
        </p>
      )}

      {(searching || results.length > 0) && (
        <div className="mt-2">
          {results.map((movie) => {
            const poster = getPosterUrl(movie.posterPath, "small");
            const added = poolIds.has(movie.id);
            return (
              <div key={movie.id} className="flex items-center gap-3 py-2">
                {poster ? (
                  <Image
                    src={poster}
                    alt={movie.title}
                    width={32}
                    height={48}
                    className="h-12 w-8 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <div className="h-12 w-8 shrink-0 rounded-sm bg-[#111]" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-[#e8e8e8]">
                  {movie.title}
                </span>
                <button
                  onClick={() => handleAdd(movie)}
                  disabled={added || submitting === movie.id || atLimit}
                  className="shrink-0 px-2 py-2 text-sm text-[#888] transition-colors hover:text-[#e8e8e8] disabled:opacity-40"
                >
                  {added ? "Added" : atLimit ? "Limit" : submitting === movie.id ? "…" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <p className="text-xs uppercase tracking-widest text-[#888]">
          Pool · {pool.length}
        </p>
        {pool.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-1">
            <AnimatePresence>
              {pool.map((movie) => {
                const poster = getPosterUrl(movie.posterPath, "small");
                return (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative aspect-[2/3] overflow-hidden rounded-sm bg-[#111] group"
                    title={movie.title}
                  >
                    {poster && (
                      <Image
                        src={poster}
                        alt={movie.title}
                        width={100}
                        height={150}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-4 pb-1 px-1 rounded-b-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <p className="text-[10px] text-white leading-tight truncate">
                        {movie.title}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {isHost && Object.keys(memberNames).length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowDashboard((v) => !v)}
            className="flex items-center gap-2 text-xs text-[#888] hover:text-[#e8e8e8] transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Member Submissions</span>
            {showDashboard ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          {showDashboard && (
            <HostSubmitDashboard
              memberNames={memberNames}
              movieSubmitters={movieSubmitters}
              pool={pool}
            />
          )}
        </div>
      )}

      <div className="mt-8">
        {isHost ? (
          pool.length >= 2 ? (
            <Button onClick={handleStartSwiping} disabled={starting}>
              {starting ? "Starting…" : `Start swiping (${pool.length} movies)`}
            </Button>
          ) : (
            <p className="text-xs text-[#888]">
              Add at least 2 movies to start swiping
            </p>
          )
        ) : (
          <p className="flex items-center gap-2 text-sm text-[#888]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff2d55] animate-pulse" />
            Everyone can add movies. Host will start swiping.
          </p>
        )}
      </div>
    </div>
  );
}

function HostSubmitDashboard({
  memberNames,
  movieSubmitters,
  pool,
}: {
  memberNames: Record<string, string>;
  movieSubmitters: Record<number, string>;
  pool: Movie[];
}) {
  const submissionsByMember: Record<string, Movie[]> = {};
  for (const uid of Object.keys(memberNames)) {
    submissionsByMember[uid] = [];
  }
  for (const movie of pool) {
    const uid = movieSubmitters[movie.id];
    if (uid) {
      if (!submissionsByMember[uid]) submissionsByMember[uid] = [];
      submissionsByMember[uid].push(movie);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {Object.entries(memberNames).map(([uid, name]) => {
        const movies = submissionsByMember[uid] ?? [];
        return (
          <div key={uid} className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[#e8e8e8]">{name}</span>
              <span className="text-[10px] text-[#888] tabular-nums">
                {movies.length} {movies.length === 1 ? "movie" : "movies"}
              </span>
            </div>
            {movies.length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {movies.map((m) => {
                  const poster = getPosterUrl(m.posterPath, "small");
                  return (
                    <div
                      key={m.id}
                      className="w-8 h-12 rounded-sm overflow-hidden bg-[#111] shrink-0"
                      title={m.title}
                    >
                      {poster && (
                        <Image
                          src={poster}
                          alt={m.title}
                          width={32}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-[#555]">No submissions yet</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
