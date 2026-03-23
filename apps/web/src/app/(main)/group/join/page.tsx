"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROOM_CODE_LENGTH } from "@reelrank/shared";

export default function JoinRoomPage() {
  const router = useRouter();
  const [values, setValues] = useState<string[]>(
    Array(ROOM_CODE_LENGTH).fill("")
  );
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = values.join("");

  const focusInput = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  function handleChange(index: number, raw: string) {
    const char = raw.slice(-1).toUpperCase();
    if (char && !/[A-Z0-9]/.test(char)) return;

    const next = [...values];
    next[index] = char;
    setValues(next);

    if (char && index < ROOM_CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      focusInput(index - 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const next = [...values];
    for (let i = 0; i < Math.min(text.length, ROOM_CODE_LENGTH); i++) {
      next[i] = text[i];
    }
    setValues(next);
    focusInput(Math.min(text.length, ROOM_CODE_LENGTH - 1));
  }

  async function handleJoin() {
    if (code.length !== ROOM_CODE_LENGTH) return;
    setLoading(true);
    const res = await api.rooms.join(code);
    if (res.data) {
      router.push(`/group/${res.data.code}`);
    } else if (res.error) {
      toast.error(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xs flex-col items-center px-4 pt-24">
      <div className="flex gap-2" onPaste={handlePaste}>
        {values.map((val, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            value={val}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            maxLength={2}
            autoFocus={i === 0}
            className="h-13 w-11 rounded-md border border-[rgba(255,255,255,0.06)] bg-[#111] text-center text-xl font-mono uppercase text-[#e8e8e8] outline-none transition-colors focus:border-[rgba(255,255,255,0.15)]"
          />
        ))}
      </div>
      <Button
        className="mt-6"
        onClick={handleJoin}
        disabled={code.length !== ROOM_CODE_LENGTH || loading}
      >
        {loading ? "Joining…" : "Join"}
      </Button>
    </div>
  );
}
