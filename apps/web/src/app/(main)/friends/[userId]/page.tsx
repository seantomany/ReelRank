"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { getPosterUrl } from "@reelrank/shared";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import type { Movie } from "@reelrank/shared";

interface WatchedItem {
  id: string;
  movieId: number;
  movie: Movie;
  rating: number;
  watchedAt: string;
  venue: string;
  notes: string | null;
}

interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  createdAt: string;
}

interface RankedItem {
  movieId: number;
  movie: Movie;
  rank: number;
}

interface FriendProfile {
  displayName: string;
  username: string | null;
  photoUrl: string | null;
  stats: {
    totalSwipes: number;
    moviesWatched: number;
    likeRate: number;
  };
  recentWatched: WatchedItem[];
  topRanked?: RankedItem[];
}

export default function FriendProfilePage(props: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = React.use(props.params as Promise<{ userId: string }>);
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [myRankings, setMyRankings] = useState<RankedItem[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    Promise.all([
      api.social.getFriendProfile(userId),
      api.solo.ranking(),
    ]).then(([profileRes, rankRes]) => {
      if (profileRes.data) setProfile(profileRes.data);
      if (profileRes.error) toast.error(profileRes.error);
      if (rankRes.data && Array.isArray(rankRes.data)) setMyRankings(rankRes.data as RankedItem[]);
    }).finally(() => setLoading(false));
  }, [userId]);

  const loadComments = useCallback(
    async (watchedId: string) => {
      const res = await api.social.getComments(watchedId);
      if (res.data) {
        setComments((prev) => ({ ...prev, [watchedId]: res.data! }));
      }
    },
    []
  );

  const handleAddComment = async (watchedId: string) => {
    if (!commentText.trim()) return;
    const res = await api.social.addComment(watchedId, userId, commentText.trim());
    if (res.error) {
      toast.error(res.error);
    } else {
      setCommentText("");
      loadComments(watchedId);
      toast.success("Comment added!");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 border-2 border-[#ff2d55] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/friends"
          className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#e8e8e8] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Friends
        </Link>
        <div className="py-20 text-center">
          <p className="text-sm text-[#888]">Profile not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <Link
        href="/friends"
        className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#e8e8e8] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Friends
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-full bg-[#111] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shrink-0">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-lg text-[#888]">
              {profile.displayName?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-[#e8e8e8]">
            {profile.displayName}
          </p>
          {profile.username && (
            <p className="text-xs text-[#888]">@{profile.username}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      {profile.stats && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[#111] rounded-lg p-3 text-center">
            <p className="text-xl font-semibold text-[#e8e8e8] tabular-nums">
              {profile.stats.totalSwipes}
            </p>
            <p className="text-[10px] text-[#888] mt-0.5">Swipes</p>
          </div>
          <div className="bg-[#111] rounded-lg p-3 text-center">
            <p className="text-xl font-semibold text-[#e8e8e8] tabular-nums">
              {profile.stats.moviesWatched}
            </p>
            <p className="text-[10px] text-[#888] mt-0.5">Watched</p>
          </div>
          <div className="bg-[#111] rounded-lg p-3 text-center">
            <p className="text-xl font-semibold text-[#ff2d55] tabular-nums">
              {profile.stats.likeRate}%
            </p>
            <p className="text-[10px] text-[#888] mt-0.5">Like Rate</p>
          </div>
        </div>
      )}

      {/* Taste Compatibility */}
      {profile.topRanked && profile.topRanked.length > 0 && myRankings.length > 0 && (() => {
        const friendIds = new Set(profile.topRanked.map((r: RankedItem) => r.movieId));
        const myIds = new Set(myRankings.map((r: RankedItem) => r.movieId));
        const overlap = [...friendIds].filter(id => myIds.has(id)).length;
        const total = new Set([...friendIds, ...myIds]).size;
        const score = total > 0 ? Math.round((overlap / total) * 100) : 0;
        const desc = score >= 80 ? "Movie soulmates!" : score >= 60 ? "Great taste overlap!" : score >= 40 ? "Decent amount in common" : score >= 20 ? "Different but complementary" : "You'll discover new movies from each other";
        return (
          <div className="mb-8 bg-[#111] rounded-xl p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-[#888] mb-2">Taste Match</p>
            <p className="text-5xl font-bold text-[#ff2d55] tabular-nums">{score}%</p>
            <p className="text-xs text-[#888] mt-2">{desc}</p>
            {overlap > 0 && (
              <p className="text-xs text-[#555] mt-1">{overlap} movies in common</p>
            )}
          </div>
        );
      })()}

      {/* Top Rankings */}
      {profile.topRanked && profile.topRanked.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-[#888]">
              Top Rankings
            </p>
            {myRankings.length > 0 && (
              <button
                onClick={() => setShowCompare(!showCompare)}
                className="text-xs text-[#ff2d55] hover:text-[#e8e8e8] transition-colors"
              >
                {showCompare ? "Hide Compare" : "Compare"}
              </button>
            )}
          </div>
          <div className="space-y-1">
            {profile.topRanked.map((item) => {
              const poster = item.movie ? getPosterUrl(item.movie.posterPath, "small") : null;
              const myIdx = myRankings.findIndex((r) => r.movieId === item.movieId);
              return (
                <Link
                  key={item.movieId}
                  href={`/movie/${item.movieId}`}
                  className="flex items-center gap-3 py-2 group"
                >
                  <span className="w-6 shrink-0 text-right text-sm font-bold text-[#ff2d55] tabular-nums">
                    {item.rank}
                  </span>
                  {poster ? (
                    <Image src={poster} alt={item.movie?.title ?? ""} width={40} height={60} className="w-10 h-15 shrink-0 rounded-sm object-cover" />
                  ) : (
                    <div className="w-10 h-15 shrink-0 rounded-sm bg-[#111]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e8e8e8] group-hover:text-white transition-colors truncate">
                      {item.movie?.title}
                    </p>
                    {showCompare && (
                      <p className="text-xs text-[#888] mt-0.5">
                        {myIdx >= 0 ? `Your rank: #${myIdx + 1}` : "Not in your rankings"}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Watches */}
      <p className="text-xs uppercase tracking-widest text-[#888] mb-3">
        Recent Watches
      </p>

      {!profile.recentWatched || profile.recentWatched.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-[#888]">No watched movies yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {profile.recentWatched.map((item) => {
            const poster = item.movie
              ? getPosterUrl(item.movie.posterPath, "small")
              : null;
            const isExpanded = expandedItem === item.id;

            return (
              <div key={item.id}>
                <div
                  className="flex items-center gap-3 py-2.5 cursor-pointer group"
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedItem(null);
                    } else {
                      setExpandedItem(item.id);
                      if (!comments[item.id]) loadComments(item.id);
                    }
                  }}
                >
                  {poster ? (
                    <Image
                      src={poster}
                      alt={item.movie?.title ?? ""}
                      width={40}
                      height={60}
                      className="w-10 h-15 shrink-0 rounded-sm object-cover"
                    />
                  ) : (
                    <div className="w-10 h-15 shrink-0 rounded-sm bg-[#111]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/movie/${item.movieId}`}
                      className="text-sm text-[#e8e8e8] hover:text-white transition-colors truncate block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.movie?.title}
                    </Link>
                    <p className="text-xs text-[#888] mt-0.5">
                      {item.rating}/10 · {item.venue}
                      {item.watchedAt ? ` · ${item.watchedAt}` : ""}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-[#888] mt-1 italic line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <MessageCircle
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isExpanded
                        ? "text-[#ff2d55]"
                        : "text-[#555] group-hover:text-[#888]"
                    }`}
                  />
                </div>

                {/* Comments */}
                {isExpanded && (
                  <div className="ml-13 mb-3 bg-[#111] rounded-lg p-3 border border-[rgba(255,255,255,0.06)]">
                    {(comments[item.id] ?? []).length === 0 && (
                      <p className="text-xs text-[#888] mb-2">
                        No comments yet
                      </p>
                    )}
                    {(comments[item.id] ?? []).map((c) => (
                      <div key={c.id} className="mb-2 last:mb-0">
                        <p className="text-xs text-[#ff2d55] font-medium">
                          {c.authorName}
                        </p>
                        <p className="text-sm text-[#e8e8e8] mt-0.5">
                          {c.text}
                        </p>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        maxLength={280}
                        className="flex-1 bg-transparent text-sm text-[#e8e8e8] placeholder:text-[#555] outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment(item.id);
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(item.id)}
                        disabled={!commentText.trim()}
                        className="cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Send
                          className={`w-4 h-4 ${
                            commentText.trim()
                              ? "text-[#ff2d55]"
                              : "text-[#555]"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
