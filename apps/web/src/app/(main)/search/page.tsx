"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Check } from "lucide-react";
import { api } from "@/lib/api";
import { getPosterUrl } from "@reelrank/shared";
import type { Movie } from "@reelrank/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [pendingId, setPendingId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addToWatchlist(movie: Movie, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (addedIds.has(movie.id) || pendingId === movie.id) return;
    setPendingId(movie.id);
    const res = await api.solo.swipe(movie.id, "right");
    setPendingId(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setAddedIds((prev) => {
      const next = new Set(prev);
      next.add(movie.id);
      return next;
    });
    toast.success(`${movie.title} added to watchlist`);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      api.movies
        .search(value.trim())
        .then((res) => {
          if (res.data) {
            setResults(res.data.movies);
          } else if (res.error) {
            toast.error(res.error);
            setResults([]);
          }
          setSearched(true);
        })
        .catch(() => {
          toast.error("Search failed");
          setResults([]);
          setSearched(true);
        })
        .finally(() => setLoading(false));
    }, 300);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search"
        autoFocus
        className="w-full bg-transparent border-0 border-b border-[rgba(255,255,255,0.06)] pb-3 text-lg text-[#e8e8e8] placeholder:text-[#555] outline-none"
      />

      <div className="mt-3">
        {loading && (
          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="w-10 h-15 shrink-0 rounded-sm" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="py-8 text-sm text-[#888]">No results</p>
        )}

        {!loading && results.length > 0 && (
          <div>
            {results.map((movie) => {
              const poster = getPosterUrl(movie.posterPath, "small");
              const year = movie.releaseDate
                ? new Date(movie.releaseDate).getFullYear()
                : null;

              const added = addedIds.has(movie.id);
              const pending = pendingId === movie.id;
              return (
                <div key={movie.id} className="flex items-center gap-3 py-2">
                  <Link href={`/movie/${movie.id}`} className="flex flex-1 items-center gap-3 min-w-0">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={movie.title}
                        width={40}
                        height={60}
                        className="w-10 h-15 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <div className="w-10 h-15 shrink-0 rounded-sm bg-[#111] flex items-center justify-center text-[9px] text-[#888]">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#e8e8e8]">
                        {movie.title}
                      </p>
                      <div className="flex items-center gap-2">
                        {year && (
                          <span className="text-xs text-[#888]">{year}</span>
                        )}
                        <span className="text-xs text-[#ff2d55]">
                          {movie.voteAverage.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => addToWatchlist(movie, e)}
                    disabled={added || pending}
                    aria-label={added ? "Added to watchlist" : "Add to watchlist"}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      added
                        ? "border-[#34c759]/40 bg-[#34c759]/10 text-[#34c759]"
                        : "border-[rgba(255,255,255,0.1)] text-[#888] hover:text-[#ff2d55] hover:border-[#ff2d55]/40"
                    } ${pending ? "opacity-50" : ""}`}
                  >
                    {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
