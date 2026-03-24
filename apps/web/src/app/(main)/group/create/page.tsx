"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function CreateRoomPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [movieLimit, setMovieLimit] = useState<string>("");

  async function handleCreate() {
    setLoading(true);
    const limit = movieLimit ? parseInt(movieLimit, 10) : undefined;
    const res = await api.rooms.create(
      name.trim() || undefined,
      undefined,
      limit && limit >= 1 && limit <= 20 ? limit : undefined,
    );
    if (res.data) {
      router.push(`/group/${res.data.code}`);
    } else if (res.error) {
      toast.error(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xs flex-col items-center px-4 pt-24">
      <p className="mb-6 text-center text-sm text-[#888]">
        Create a room, share the code, pick a movie together.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Room name (optional)"
        maxLength={50}
        className="w-full mb-4 bg-transparent border-b border-[rgba(255,255,255,0.1)] pb-2 text-sm text-[#e8e8e8] placeholder:text-[#555] outline-none text-center"
        onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
      />
      <div className="w-full mb-4">
        <label className="block text-[10px] uppercase tracking-widest text-[#888] mb-1.5 text-center">
          Movies per person (optional)
        </label>
        <input
          type="number"
          value={movieLimit}
          onChange={(e) => setMovieLimit(e.target.value)}
          placeholder="No limit"
          min={1}
          max={20}
          className="w-full bg-transparent border-b border-[rgba(255,255,255,0.1)] pb-2 text-sm text-[#e8e8e8] placeholder:text-[#555] outline-none text-center tabular-nums"
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
        />
      </div>
      <Button onClick={handleCreate} disabled={loading}>
        {loading ? "Creating…" : "Create room"}
      </Button>
    </div>
  );
}
