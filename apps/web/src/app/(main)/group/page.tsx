"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPosterUrl } from "@reelrank/shared";
import { Pin, PinOff } from "lucide-react";
import type { Movie } from "@reelrank/shared";

interface RoomHistoryItem {
  id: string;
  code: string;
  name?: string;
  hostId: string;
  status: string;
  memberCount: number;
  createdAt: string;
  winnerMovie?: Movie;
}

const STATUS_DOT: Record<string, string> = {
  lobby: "#888",
  submitting: "#ff2d55",
  swiping: "#cc2244",
  results: "#ff2d55",
};

const STATUS_LABEL: Record<string, string> = {
  lobby: "Lobby",
  submitting: "Adding movies",
  swiping: "Swiping",
  results: "Done",
};

function roomHref(room: RoomHistoryItem): string {
  const base = `/group/${room.code}`;
  switch (room.status) {
    case "submitting":
      return `${base}/submit`;
    case "swiping":
      return `${base}/swipe`;
    case "results":
      return `${base}/results`;
    default:
      return base;
  }
}

export default function GroupHubPage() {
  const router = useRouter();
  const [history, setHistory] = useState<RoomHistoryItem[]>([]);
  const [pinnedCodes, setPinnedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.rooms.history(),
      api.auth.verify(),
    ]).then(([historyRes, userRes]) => {
      if (historyRes.data) setHistory(historyRes.data);
      else if (historyRes.error) toast.error(historyRes.error);
      if (userRes.data) {
        const userData = userRes.data as Record<string, unknown>;
        if (Array.isArray(userData.pinnedRooms)) {
          setPinnedCodes(userData.pinnedRooms);
        }
      }
      setLoading(false);
    });
  }, []);

  const togglePin = async (code: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isPinned = pinnedCodes.includes(code);
    if (isPinned) {
      setPinnedCodes((prev) => prev.filter((c) => c !== code));
      await api.rooms.unpin(code);
    } else {
      setPinnedCodes((prev) => [code, ...prev]);
      await api.rooms.pin(code);
    }
  };

  const sortedHistory = [...history].sort((a, b) => {
    const aPinned = pinnedCodes.includes(a.code);
    const bPinned = pinnedCodes.includes(b.code);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex gap-3">
        <Button onClick={() => router.push("/group/create")}>
          Create room
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push("/group/join")}
        >
          Join room
        </Button>
      </div>

      <div className="mt-10">
        <p className="text-xs uppercase tracking-widest text-[#888]">Recent</p>

        {loading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="mt-3 text-sm text-[#888]">
            No rooms yet. Create one and invite your friends.
          </p>
        ) : (
          <div className="mt-3">
            {sortedHistory.map((room) => {
              const poster =
                room.status === "results" && room.winnerMovie
                  ? getPosterUrl(room.winnerMovie.posterPath, "small")
                  : null;
              const isPinned = pinnedCodes.includes(room.code);

              return (
                <Link
                  key={room.id}
                  href={roomHref(room)}
                  className="flex items-center py-2.5 group"
                >
                  <button
                    onClick={(e) => togglePin(room.code, e)}
                    className="mr-2 p-1 rounded hover:bg-[#222] transition-colors cursor-pointer shrink-0"
                    title={isPinned ? "Unpin" : "Pin to top"}
                  >
                    {isPinned ? (
                      <Pin className="w-3.5 h-3.5 text-[#ff2d55]" />
                    ) : (
                      <Pin className="w-3.5 h-3.5 text-[#555] group-hover:text-[#888]" />
                    )}
                  </button>
                  <span
                    className="mr-3 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background: STATUS_DOT[room.status] ?? "#888",
                    }}
                  />
                  <div className="flex flex-col">
                    {room.name && (
                      <span className="text-sm text-[#e8e8e8] group-hover:text-white transition-colors">
                        {room.name}
                      </span>
                    )}
                    <span className="font-mono text-xs text-[#888] group-hover:text-[#aaa] transition-colors">
                      {room.code}
                    </span>
                  </div>
                  <span className="ml-3 text-xs text-[#888]">
                    {STATUS_LABEL[room.status] ?? room.status}
                  </span>
                  <span className="ml-3 text-xs text-[#888]">
                    {room.memberCount}{" "}
                    {room.memberCount === 1 ? "member" : "members"}
                  </span>
                  <span className="ml-3 text-xs text-[#888]">
                    {new Date(room.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex-1" />
                  {poster && (
                    <Image
                      src={poster}
                      alt=""
                      width={24}
                      height={36}
                      className="ml-2 h-9 w-6 rounded-sm object-cover"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
