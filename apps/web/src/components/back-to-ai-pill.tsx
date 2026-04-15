"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const STORAGE_KEY = "reelrank-ai-chat";

function hasActiveChat(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function BackToAIPill() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(hasActiveChat());
    // Re-check when sessionStorage changes within the tab (e.g. chat reset)
    // or when another tab updates it.
    const handler = () => setVisible(hasActiveChat());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [pathname]);

  if (!visible) return null;
  if (pathname === "/ai" || pathname?.startsWith("/ai/")) return null;

  return (
    <Link
      href="/ai"
      className="fixed z-40 left-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-5 flex items-center gap-1.5 rounded-full bg-[#111] border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs text-[#e8e8e8] shadow-lg backdrop-blur-sm hover:border-[#ff2d55] transition-colors"
      aria-label="Back to AI chat"
    >
      <Sparkles className="h-3.5 w-3.5 text-[#ff2d55]" />
      <span>Back to AI</span>
    </Link>
  );
}
