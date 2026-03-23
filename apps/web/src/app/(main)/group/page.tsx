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
import type { Movie } from "@reelrank/shared";

interface RoomHistoryItem {
  id: string;
  code: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.rooms.history().then((res) => {
      if (res.data) setHistory(res.data);
      else if (res.error) toast.error(res.error);
      setLoading(false);
    });
  }, []);

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
            {history.map((room) => {
              const poster =
                room.status === "results" && room.winnerMovie
                  ? getPosterUrl(room.winnerMovie.posterPath, "small")
                  : null;

              return (
                <Link
                  key={room.id}
                  href={roomHref(room)}
                  className="flex items-center py-2.5 group"
                >
                  <span
                    className="mr-3 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background: STATUS_DOT[room.status] ?? "#888",
                    }}
                  />
                  <span className="font-mono text-sm text-[#e8e8e8] group-hover:text-white transition-colors">
                    {room.code}
                  </span>
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
