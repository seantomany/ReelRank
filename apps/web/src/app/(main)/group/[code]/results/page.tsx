"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, apiFetch } from "@/lib/api";
import { subscribeToRoom } from "@/lib/ably";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPosterUrl, ABLY_EVENTS } from "@reelrank/shared";
import { useAuth } from "@/context/auth-context";
import { Pencil, Check } from "lucide-react";
import type { RoomResultExtended, SwipeDirection, Movie } from "@reelrank/shared";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export default function ResultsPage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = React.use(props.params as Promise<{ code: string }>);
  const router = useRouter();

  const { user } = useAuth();
  const [result, setResult] = useState<RoomResultExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMovie, setExpandedMovie] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [bonusActive, setBonusActive] = useState(false);
  const [bonusMovies, setBonusMovies] = useState<Movie[]>([]);
  const [bonusVoted, setBonusVoted] = useState(false);
  const [bonusWinner, setBonusWinner] = useState<Movie | null>(null);
  const [groupName, setGroupName] = useState("");
  const [editingName, setEditingName] = useState(false);

  const fetchResults = useCallback(
    async (retriesLeft = MAX_RETRIES) => {
      const res = await api.rooms.results(code);
      if (res.data) {
        setResult(res.data as unknown as RoomResultExtended);
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
      [ABLY_EVENTS.BONUS_STARTED]: (data: unknown) => {
        const payload = data as { movies?: Movie[] };
        setBonusActive(true);
        if (payload.movies) setBonusMovies(payload.movies);
      },
      [ABLY_EVENTS.BONUS_COMPLETED]: (data: unknown) => {
        const payload = data as { movie?: Movie };
        setBonusActive(false);
        setBonusVoted(false);
        if (payload.movie) {
          setBonusWinner(payload.movie);
          toast.success(`Bonus round winner: ${payload.movie.title}`);
        }
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
        <p className="text-sm text-[#888]">No results available yet</p>
        <p className="text-xs text-[#555] mt-1">Results may still be computing. Try again in a moment.</p>
        <div className="flex gap-3 justify-center mt-4">
          <Button variant="secondary" onClick={() => { setLoading(true); fetchResults(); }}>
            Retry
          </Button>
          <Button variant="secondary" onClick={() => router.push("/group")}>
            Back to groups
          </Button>
        </div>
      </div>
    );
  }

  const winner = result.rankedMovies[0];
  const runnersUp = result.rankedMovies.slice(1);
  const winnerPoster = getPosterUrl(winner.movie.posterPath, "large");
  const winnerYear = winner.movie.releaseDate?.slice(0, 4);
  const topScore = winner.finalScore;
  const memberVotes = result.memberVotes ?? [];
  const submissions = result.submissions ?? [];
  const memberStats = result.memberStats ?? [];

  const groupPicks = result.rankedMovies.filter(
    (m) => m.rightSwipes === m.totalVoters && m.totalVoters > 0
  );
  const hasMultiplePicks = groupPicks.length > 1;

  const handleStartBonusRound = async () => {
    const movieIds = groupPicks.map((m) => m.movieId);
    const res = await apiFetch<{ bonusRoundId: string; movies: Movie[]; status: string }>(
      `/api/rooms/${code}/bonus-round`,
      { method: "POST", body: JSON.stringify({ movieIds }) }
    );
    if (res.data) {
      setBonusActive(true);
      setBonusMovies(res.data.movies);
    } else if (res.error) {
      toast.error(res.error);
    }
  };

  const handleBonusVote = async (movieId: number) => {
    if (bonusVoted) return;
    setBonusVoted(true);
    const res = await apiFetch<{ status: string; winnerId?: number; movie?: Movie }>(
      `/api/rooms/${code}/bonus-round`,
      { method: "POST", body: JSON.stringify({ movieId }) }
    );
    if (res.data?.status === "completed" && res.data.movie) {
      setBonusWinner(res.data.movie);
      setBonusActive(false);
      toast.success(`Bonus round winner: ${res.data.movie.title}`);
    } else if (res.error) {
      toast.error(res.error);
      setBonusVoted(false);
    }
  };

  function getSubmitter(movieId: number) {
    const sub = submissions.find((s) => s.movieId === movieId);
    return sub?.submittedBy?.username ?? sub?.submittedBy?.userId?.slice(0, 8) ?? null;
  }

  function getVotersForMovie(movieId: number) {
    return memberVotes.filter((v) => v.movieId === movieId);
  }

  function renderVoteBreakdown(movieId: number) {
    const votes = getVotersForMovie(movieId);
    if (votes.length === 0) return null;
    const yes = votes.filter((v) => v.direction === "right");
    const no = votes.filter((v) => v.direction === "left");

    return (
      <div className="mt-2 pl-8 space-y-1">
        {yes.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-[#ff2d55]">Yes:</span>
            {yes.map((v) => (
              <span key={v.userId} className="text-[10px] px-1.5 py-0.5 rounded text-[#888] bg-[#111]">
                {v.username ?? v.userId.slice(0, 8)}
              </span>
            ))}
          </div>
        )}
        {no.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-[#888]">No:</span>
            {no.map((v) => (
              <span key={v.userId} className="text-[10px] text-[#888] bg-[#111] px-1.5 py-0.5 rounded">
                {v.username ?? v.userId.slice(0, 8)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleSaveName = async () => {
    setEditingName(false);
    const res = await api.rooms.rename(code, groupName.trim());
    if (res.error) toast.error(res.error);
    else toast.success("Group renamed!");
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      {/* Editable Group Name */}
      <div className="mb-6">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Name this group..."
              maxLength={100}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
              className="flex-1 bg-transparent text-lg font-semibold text-[#e8e8e8] placeholder:text-[#555] outline-none border-b border-[#ff2d55] pb-1"
            />
            <button onClick={handleSaveName}>
              <Check className="w-5 h-5 text-[#ff2d55]" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-2 group"
          >
            <span className="text-lg font-semibold text-[#e8e8e8] group-hover:text-white transition-colors">
              {groupName || `Group ${code}`}
            </span>
            <Pencil className="w-4 h-4 text-[#555] group-hover:text-[#888] transition-colors" />
          </button>
        )}
      </div>

      {/* Bonus round winner */}
      {bonusWinner && (
        <div className="text-center mb-8 py-4 bg-[#111] rounded-lg">
          <p className="text-xs uppercase tracking-widest text-[#ff2d55] mb-2">Bonus Round Winner</p>
          <p className="text-lg font-semibold text-[#e8e8e8]">{bonusWinner.title}</p>
        </div>
      )}

      {/* Bonus round voting */}
      {bonusActive && bonusMovies.length > 0 && (
        <div className="mb-8 py-4 bg-[#111] rounded-lg px-4">
          <p className="text-xs uppercase tracking-widest text-[#ff2d55] mb-3 text-center">Bonus Round</p>
          <p className="text-xs text-[#888] text-center mb-4">Pick your favorite from the group picks</p>
          <div className="grid grid-cols-2 gap-3">
            {bonusMovies.map((m) => {
              const p = getPosterUrl(m.posterPath, "medium");
              return (
                <button
                  key={m.id}
                  onClick={() => handleBonusVote(m.id)}
                  disabled={bonusVoted}
                  className="flex flex-col items-center gap-1 disabled:opacity-50"
                >
                  {p ? (
                    <Image src={p} alt={m.title} width={100} height={150} className="w-full aspect-[2/3] rounded-sm object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-sm bg-[#222]" />
                  )}
                  <span className="text-xs text-[#e8e8e8] truncate w-full text-center">{m.title}</span>
                </button>
              );
            })}
          </div>
          {bonusVoted && <p className="text-xs text-[#888] text-center mt-3">Waiting for others...</p>}
        </div>
      )}

      {/* Group Picks */}
      {groupPicks.length > 1 && (
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-[#ff2d55] mb-3">Group Picks (unanimous)</p>
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {groupPicks.map((entry) => {
              const poster = getPosterUrl(entry.movie.posterPath, "small");
              return (
                <Link key={entry.movieId} href={`/movie/${entry.movieId}`} className="shrink-0 block w-[80px]">
                  {poster ? (
                    <Image src={poster} alt={entry.movie.title} width={80} height={120} className="w-full aspect-[2/3] rounded-sm object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-sm bg-[#111]" />
                  )}
                  <p className="text-[10px] text-[#e8e8e8] truncate mt-1">{entry.movie.title}</p>
                </Link>
              );
            })}
          </div>
          {hasMultiplePicks && !bonusActive && !bonusWinner && (
            <button
              onClick={handleStartBonusRound}
              className="mt-3 text-xs text-[#ff2d55] hover:text-[#e8e8e8] transition-colors underline underline-offset-2"
            >
              Start bonus round to pick one
            </button>
          )}
        </div>
      )}

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
        <h1 className="mt-4 text-xl font-semibold text-[#e8e8e8]">{winner.movie.title}</h1>
        {winnerYear && <p className="text-sm text-[#888] mt-0.5">{winnerYear}</p>}
        <p className="mt-1 text-sm text-[#ff2d55] tabular-nums">
          {Math.round(winner.finalScore)}% · {winner.rightSwipes}/{winner.totalVoters} voted yes
        </p>
        {getSubmitter(winner.movieId) && (
          <p className="text-xs text-[#888] mt-1">
            Added by <span className="text-[#e8e8e8]">{getSubmitter(winner.movieId)}</span>
          </p>
        )}
      </div>

      {/* Full rankings */}
      {runnersUp.length > 0 && (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-widest text-[#888] mb-3">Full Rankings</p>
          {runnersUp.map((entry, i) => {
            const poster = getPosterUrl(entry.movie.posterPath, "small");
            const barWidth = topScore > 0 ? (entry.finalScore / topScore) * 100 : 0;
            const submitter = getSubmitter(entry.movieId);
            const isExpanded = expandedMovie === entry.movieId;

            return (
              <div key={entry.movieId}>
                <div
                  className="flex items-center gap-3 py-2 group cursor-pointer"
                  onClick={() => setExpandedMovie(isExpanded ? null : entry.movieId)}
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
                    <p className="truncate text-sm text-[#e8e8e8]">{entry.movie.title}</p>
                    <p className="text-xs text-[#888] tabular-nums">
                      {Math.round(entry.finalScore)}% · {entry.rightSwipes}/{entry.totalVoters} voted yes
                      {submitter && <span className="text-[#888]"> · by {submitter}</span>}
                    </p>
                    <div className="mt-1 h-1 w-full overflow-hidden bg-[#111] rounded-full">
                      <div className="h-full bg-[#ff2d55] rounded-full" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                </div>
                {isExpanded && renderVoteBreakdown(entry.movieId)}
              </div>
            );
          })}
        </div>
      )}

      {/* Group stats */}
      {memberStats.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-xs uppercase tracking-widest text-[#888] mb-3 hover:text-[#e8e8e8] transition-colors"
          >
            Group Stats {showStats ? "▴" : "▾"}
          </button>
          {showStats && (
            <div className="space-y-2">
              {memberStats.map((m) => (
                <div key={m.userId} className="flex items-center gap-3 py-1.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111]">
                    <span className="text-[9px] text-[#888]">
                      {(m.username ?? m.userId.slice(0, 1)).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e8e8e8] truncate">{m.username ?? m.userId.slice(0, 8)}</p>
                    <p className="text-xs text-[#888] tabular-nums">
                      {m.rightCount} yes · {m.leftCount} no · {m.agreementScore}% agreement
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
