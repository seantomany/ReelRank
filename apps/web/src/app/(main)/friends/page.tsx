"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getPosterUrl } from "@reelrank/shared";
import { ArrowLeft, Search, X, UserPlus, Check, XIcon, ChevronRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Friend {
  friendshipId: string;
  userId: string;
  displayName: string;
  username: string | null;
  photoUrl: string | null;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  fromPhotoUrl: string | null;
  createdAt: string;
}

interface SearchResult {
  id: string;
  displayName: string;
  username: string | null;
  photoUrl: string | null;
  email: string;
}

interface FeedItem {
  id: string;
  userId: string;
  movieId: number;
  rating: number | null;
  venue: string | null;
  watchedAt: string | null;
  friend: { displayName: string; photoUrl: string | null };
  movie: { id: number; title: string; posterPath: string; releaseDate: string; voteAverage: number };
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  const loadData = useCallback(async () => {
    const [friendsRes, requestsRes, feedRes] = await Promise.all([
      api.social.getFriends(),
      api.social.getRequests(),
      api.social.feed(),
    ]);
    if (friendsRes.data) setFriends(friendsRes.data);
    if (requestsRes.data) setRequests(requestsRes.data);
    if (feedRes.data && Array.isArray(feedRes.data)) setFeed(feedRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await api.social.searchUsers(searchQuery);
      if (res.data) setSearchResults(res.data);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendRequest = async (userId: string) => {
    const res = await api.social.sendRequest(userId);
    if (res.error) {
      toast.error(res.error);
    } else if (res.data?.accepted) {
      toast.success("You are now friends!");
      loadData();
    } else {
      toast.success("Friend request sent!");
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRequest = async (id: string, action: "accept" | "reject") => {
    await api.social.handleRequest(id, action);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (action === "accept") {
      toast.success("Friend added!");
      loadData();
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/profile"
        className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#e8e8e8] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Profile
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-[#e8e8e8]">Friends</h1>
        <button
          onClick={async () => {
            const msg = "Add me on ReelRank! Search for my username or email to connect.";
            if (navigator.share) {
              try { await navigator.share({ text: msg }); } catch {}
            } else {
              await navigator.clipboard.writeText(msg);
              toast.success("Invite text copied to clipboard!");
            }
          }}
          className="flex items-center gap-1.5 text-xs text-[#ff2d55] hover:text-white transition-colors px-3 py-1.5 rounded-full bg-[#ff2d55]/10 hover:bg-[#ff2d55]/20 cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          Invite
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="flex items-center gap-2 bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-[#555]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or username..."
            className="flex-1 bg-transparent text-sm text-[#e8e8e8] placeholder:text-[#555] outline-none"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="cursor-pointer"
            >
              <X className="w-4 h-4 text-[#555] hover:text-[#888] transition-colors" />
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden z-10">
            {searchResults.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center shrink-0">
                  <span className="text-xs text-[#888]">
                    {u.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#e8e8e8] truncate">{u.displayName}</p>
                  <p className="text-xs text-[#888]">{u.email}</p>
                </div>
                <button
                  onClick={() => handleSendRequest(u.id)}
                  className="flex items-center gap-1 text-xs text-[#ff2d55] hover:text-[#e8e8e8] transition-colors px-3 py-1.5 rounded-full bg-[#ff2d55]/10 hover:bg-[#ff2d55]/20 cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" />
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Requests */}
      {requests.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-widest text-[#888] mb-3">
            Requests ({requests.length})
          </p>
          <div className="space-y-1">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)]"
              >
                <div className="w-9 h-9 rounded-full bg-[#222] flex items-center justify-center shrink-0">
                  <span className="text-xs text-[#888]">
                    {r.fromDisplayName?.charAt(0)?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#e8e8e8]">{r.fromDisplayName}</p>
                  <p className="text-xs text-[#888]">Wants to be friends</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequest(r.id, "accept")}
                    className="w-8 h-8 rounded-full bg-[#ff2d55] flex items-center justify-center cursor-pointer hover:bg-[#e0264b] transition-colors"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => handleRequest(r.id, "reject")}
                    className="w-8 h-8 rounded-full bg-[#111] border border-[rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer hover:border-red-500 transition-colors"
                  >
                    <XIcon className="w-4 h-4 text-[#888]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <p className="text-[10px] uppercase tracking-widest text-[#888] mb-3">
        Friends ({friends.length})
      </p>

      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block h-5 w-5 border-2 border-[#ff2d55] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : friends.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-[#888]">No friends yet</p>
          <p className="text-xs text-[#888] mt-1">
            Search by email or username to add friends
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {friends.map((f) => (
            <Link
              key={f.friendshipId}
              href={`/friends/${f.userId}`}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[#111] transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-[#111] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shrink-0 group-hover:border-[rgba(255,255,255,0.12)]">
                {f.photoUrl ? (
                  <img
                    src={f.photoUrl}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-[#888]">
                    {f.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#e8e8e8] group-hover:text-white transition-colors">
                  {f.displayName}
                </p>
                {f.username && (
                  <p className="text-xs text-[#888]">@{f.username}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-[#888] transition-colors" />
            </Link>
          ))}
        </div>
      )}

      {/* Activity Feed */}
      {feed.length > 0 && (
        <div className="mt-8">
          <p className="text-[10px] uppercase tracking-widest text-[#888] mb-3">
            Recent Activity
          </p>
          <div className="space-y-2">
            {feed.map((item) => {
              const poster = getPosterUrl(item.movie.posterPath, "small");
              const year = item.movie.releaseDate?.slice(0, 4);
              return (
                <Link
                  key={item.id}
                  href={`/movie/${item.movie.id}`}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[#111] transition-colors group"
                >
                  {poster && (
                    <Image
                      src={poster}
                      alt=""
                      width={36}
                      height={54}
                      className="rounded-sm object-cover w-9 h-[54px] shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e8e8e8]">
                      <span className="font-medium">{item.friend.displayName}</span>
                      {" watched "}
                      <span className="font-medium">{item.movie.title}</span>
                      {year && <span className="text-[#888]"> ({year})</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.rating != null && (
                        <span className="text-xs text-[#ff2d55] font-medium">{item.rating}/10</span>
                      )}
                      {item.venue && (
                        <span className="text-xs text-[#888]">{item.venue}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
