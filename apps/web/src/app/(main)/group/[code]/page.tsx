"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { subscribeToRoom } from "@/lib/ably";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ABLY_EVENTS } from "@reelrank/shared";
import type { Room } from "@reelrank/shared";

function memberName(member: { userId: string; user?: { displayName?: string | null } }): string {
  if (member.user?.displayName) return member.user.displayName;
  return member.userId.slice(0, 8);
}

export default function LobbyPage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = React.use(props.params as Promise<{ code: string }>);
  const router = useRouter();
  const { user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.rooms.get(code).then((res) => {
      if (res.data) {
        if (res.data.status === "submitting") {
          router.push(`/group/${code}/submit`);
          return;
        }
        if (res.data.status === "swiping") {
          router.push(`/group/${code}/swipe`);
          return;
        }
        if (res.data.status === "results") {
          router.push(`/group/${code}/results`);
          return;
        }
        setRoom(res.data);
      } else if (res.error) {
        toast.error(res.error);
      }
      setLoading(false);
    });
  }, [code, router]);

  useEffect(() => {
    const unsubscribe = subscribeToRoom(code, {
      [ABLY_EVENTS.MEMBER_JOINED]: () => {
        api.rooms.get(code).then((res) => {
          if (res.data) setRoom(res.data);
        });
      },
      [ABLY_EVENTS.MEMBER_LEFT]: () => {
        api.rooms.get(code).then((res) => {
          if (res.data) setRoom(res.data);
        });
      },
      [ABLY_EVENTS.ROOM_STATUS]: (data: unknown) => {
        const payload = data as { status?: string };
        if (payload.status === "submitting") {
          router.push(`/group/${code}/submit`);
        }
      },
    });
    return unsubscribe;
  }, [code, router]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await api.rooms.get(code);
      if (res.data) {
        if (res.data.status === "submitting") {
          router.push(`/group/${code}/submit`);
        } else if (res.data.status === "swiping") {
          router.push(`/group/${code}/swipe`);
        } else if (res.data.status === "results") {
          router.push(`/group/${code}/results`);
        } else {
          setRoom(res.data);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [code, router]);

  async function handleStart() {
    setStarting(true);
    const res = await api.rooms.start(code, "submitting");
    if (res.error) {
      toast.error(res.error);
      setStarting(false);
    } else {
      router.push(`/group/${code}/submit`);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      toast("Copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  const isHost = room?.hostId === user?.uid;
  const members = room?.members ?? [];

  if (loading) {
    return (
      <div className="mx-auto max-w-sm px-4 py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      {/* Room code */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-mono font-semibold tracking-widest text-[#e8e8e8]">
          {code}
        </h1>
        <button
          onClick={handleCopy}
          className="text-xs text-[#888] transition-colors hover:text-[#e8e8e8] cursor-pointer"
        >
          Copy
        </button>
      </div>

      <p className="mt-1 text-xs text-[#888]">
        Share this code with your group
      </p>

      {/* Members */}
      <div className="mt-8">
        <p className="mb-3 text-xs uppercase tracking-widest text-[#888]">
          Members · {members.length}
        </p>
        <div>
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111]">
                <span className="text-[10px] text-[#888]">
                  {memberName(member).charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-[#e8e8e8]">
                {memberName(member)}
              </span>
              {member.userId === room.hostId && (
                <span className="text-xs text-[#ff2d55]">host</span>
              )}
              {member.userId === user?.uid && member.userId !== room.hostId && (
                <span className="text-xs text-[#888]">you</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-10">
        {isHost ? (
          <div>
            <Button onClick={handleStart} disabled={starting}>
              {starting ? "Starting…" : "Start"}
            </Button>
            {members.length < 2 && (
              <p className="mt-2 text-xs text-[#888]">
                Waiting for at least one more person to join
              </p>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-[#888]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff2d55] animate-pulse" />
            Waiting for host to start
          </p>
        )}
      </div>
    </div>
  );
}
