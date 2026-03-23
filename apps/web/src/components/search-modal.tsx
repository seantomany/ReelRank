"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getPosterUrl } from "@reelrank/shared";
import type { Movie } from "@reelrank/shared";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const res = await api.movies.search(q);
    if (res.data) { setResults(res.data.movies.slice(0, 8)); setSel(0); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, search]);

  const go = useCallback((id: number) => { onClose(); router.push(`/movie/${id}`); }, [onClose, router]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && results[sel]) go(results[sel].id);
  }, [results, sel, go]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative max-w-lg mx-auto mt-[20vh]">
        <div className="bg-[#111] rounded-md overflow-hidden mx-4">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search movies..."
            className="w-full bg-transparent text-[#e8e8e8] text-base px-4 h-12 outline-none placeholder:text-[#555] border-b border-[rgba(255,255,255,0.06)]"
          />
          {results.length > 0 && (
            <div className="max-h-[320px] overflow-y-auto">
              {results.map((m, i) => {
                const poster = getPosterUrl(m.posterPath, "small");
                return (
                  <button
                    key={m.id}
                    onClick={() => go(m.id)}
                    onMouseEnter={() => setSel(i)}
                    className={`flex items-center gap-3 w-full px-4 py-2 text-left cursor-pointer transition-colors ${
                      i === sel ? "bg-[rgba(255,255,255,0.04)]" : ""
                    }`}
                  >
                    {poster ? (
                      <Image src={poster} alt="" width={32} height={48} className="rounded-sm object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-12 bg-[#000] rounded-sm shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#e8e8e8] truncate">{m.title}</p>
                      <p className="text-xs text-[#888]">{m.releaseDate?.slice(0, 4)}</p>
                    </div>
                    {m.voteAverage > 0 && (
                      <span className="text-xs text-[#ff2d55] tabular-nums">{m.voteAverage.toFixed(1)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {query.length >= 2 && !loading && results.length === 0 && (
            <p className="px-4 py-6 text-sm text-[#888] text-center">No results</p>
          )}
          {loading && (
            <div className="px-4 py-4 space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-12 skeleton-pulse rounded-sm" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
