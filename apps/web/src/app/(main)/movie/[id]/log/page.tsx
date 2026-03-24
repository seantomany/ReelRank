"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RankFlowModal } from "@/components/rank-flow-modal";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Movie } from "@reelrank/shared";

const VENUES = ["Theater", "Home", "Friend's", "Outdoor", "Other"] as const;
const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function LogWatchedPage(props: { params: Promise<{ id: string }> }) {
  const { id } = React.use(props.params as Promise<{ id: string }>);
  const router = useRouter();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRankFlow, setShowRankFlow] = useState(false);

  const [rating, setRating] = useState(7);
  const [venue, setVenue] = useState<(typeof VENUES)[number]>("Home");
  const [watchedAt, setWatchedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    api.movies.get(Number(id)).then((res) => {
      if (res.data) setMovie(res.data);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    const res = await api.solo.logWatched({
      movieId: Number(id),
      rating,
      watchedAt,
      venue,
      notes: notes.trim() || undefined,
    });
    if (res.error) {
      toast.error(res.error);
      setSubmitting(false);
      return;
    }
    toast.success(`Logged ${movie?.title ?? "movie"} — ${rating}/10`);
    setSubmitting(false);
    setShowRankFlow(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000] flex flex-col justify-end md:justify-center">
        <div className="max-w-sm mx-auto w-full px-4 py-6 space-y-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-14 w-20 mx-auto" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (showRankFlow && movie) {
    return (
      <RankFlowModal
        movie={movie}
        open
        rating={rating}
        onClose={() => router.push(`/movie/${id}`)}
        onSkip={() => router.push(`/movie/${id}`)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#000] flex flex-col justify-end md:justify-center">
      <div className="max-w-sm mx-auto w-full px-4 py-6 min-h-[calc(100vh-6rem)] md:min-h-0 flex flex-col justify-end md:justify-center">
        <div className="space-y-6">
          {/* Movie title */}
          <p className="text-sm text-[#888]">{movie?.title}</p>

          {/* Rating — big number + tappable row */}
          <div>
            <motion.p
              key={rating}
              initial={{ scale: 1.15, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="text-5xl font-semibold text-[#ff2d55] tabular-nums text-center"
            >
              {rating}
            </motion.p>

            {/* Tappable number row */}
            <div className="flex justify-between mt-4 px-1">
              {RATINGS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-all cursor-pointer ${
                    n === rating
                      ? "bg-[#ff2d55] text-white font-semibold"
                      : n <= rating
                        ? "text-[#ff2d55]"
                        : "text-[#888]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#888]">Where</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {VENUES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVenue(v)}
                  className={`rounded-full text-xs px-3 py-1.5 min-h-[36px] transition-colors cursor-pointer ${
                    venue === v
                      ? "bg-[#111] text-[#e8e8e8]"
                      : "text-[#888] hover:text-[#aaa]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#888]">When</label>
            <input
              type="date"
              value={watchedAt}
              onChange={(e) => setWatchedAt(e.target.value)}
              className="mt-2 block w-full bg-[#111] rounded-md text-sm text-[#e8e8e8] px-3 py-2 min-h-[44px] border-0 outline-none"
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#888]">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Optional"
              className="mt-2 block w-full bg-[#111] rounded-md text-sm text-[#e8e8e8] px-3 py-2 border-0 outline-none resize-none placeholder:text-[#555]"
            />
          </div>

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full min-h-[44px]">
            {submitting ? "Saving…" : "Save"}
          </Button>

          {/* Cancel */}
          <button
            type="button"
            onClick={() => router.push(`/movie/${id}`)}
            className="block w-full text-center text-sm text-[#888] py-2 min-h-[44px] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
