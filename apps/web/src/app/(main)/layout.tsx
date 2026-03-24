"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { SearchModal } from "@/components/search-modal";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen(v => !v);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <AuthGuard>
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main className="pt-12 md:pt-14 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 min-h-[100dvh]">
        {children}
      </main>
    </AuthGuard>
  );
}
