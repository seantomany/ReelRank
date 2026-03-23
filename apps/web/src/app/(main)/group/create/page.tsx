"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function CreateRoomPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    const res = await api.rooms.create();
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
      <Button onClick={handleCreate} disabled={loading}>
        {loading ? "Creating…" : "Create room"}
      </Button>
    </div>
  );
}
