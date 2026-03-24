"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Movie, SoloRanking, TriageZone } from "@reelrank/shared";
import { getPosterUrl } from "@reelrank/shared";

interface RankFlowModalProps {
  movie: Movie;
  open: boolean;
  onClose: () => void;
  onSkip?: () => void;
  onRanked?: (rankings: SoloRanking[]) => void;
}

type Step = "triage" | "compare" | "done";

const TRIAGE_OPTIONS: { zone: TriageZone; label: string; emoji: string }[] = [
  { zone: "loved", label: "Loved it", emoji: "🤩" },
  { zone: "liked", label: "Liked it", emoji: "😊" },
  { zone: "okay", label: "It was okay", emoji: "😐" },
  { zone: "disliked", label: "Didn't like it", emoji: "😕" },
];

function getTriageRange(zone: TriageZone, total: number): [number, number] {
  if (total === 0) return [0, 0];
  const quarter = Math.ceil(total / 4);
  switch (zone) {
    case "loved": return [0, Math.min(quarter, total)];
    case "liked": return [quarter, Math.min(quarter * 2, total)];
    case "okay": return [quarter * 2, Math.min(quarter * 3, total)];
    case "disliked": return [quarter * 3, total];
  }
}

export function RankFlowModal({ movie, open, onClose, onSkip, onRanked }: RankFlowModalProps) {
  const [step, setStep] = useState<Step>("triage");
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(0);
  const [mid, setMid] = useState(0);
  const [comparing, setComparing] = useState(false);
  const [insertIndex, setInsertIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [flashId, setFlashId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("triage");
      setRankings([]);
      setLow(0);
      setHigh(0);
      setMid(0);
      return;
    }

    api.solo.ranking().then((res) => {
      if (res.data) setRankings(res.data);
    });
  }, [open]);

  const startCompare = useCallback((zone: TriageZone) => {
    if (rankings.length === 0) {
      setInsertIndex(0);
      setStep("done");
      return;
    }

    const [lo, hi] = getTriageRange(zone, rankings.length);
    if (lo >= hi) {
      setInsertIndex(lo);
      setStep("done");
      return;
    }

    setLow(lo);
    setHigh(hi);
    const m = Math.floor((lo + hi) / 2);
    setMid(m);
    setStep("compare");
  }, [rankings]);

  const handleTriage = (zone: TriageZone) => {
    startCompare(zone);
  };

  const handleCompare = async (preferNew: boolean) => {
    if (comparing) return;
    setComparing(true);
    setFlashId(preferNew ? movie.id : rankings[mid]?.movieId ?? null);

    if (rankings[mid]) {
      const chosenId = preferNew ? movie.id : rankings[mid].movieId;
      await api.solo.pairwise(movie.id, rankings[mid].movieId, chosenId);
    }

    await new Promise((r) => setTimeout(r, 200));
    setFlashId(null);

    let newLow = low;
    let newHigh = high;

    if (preferNew) {
      newHigh = mid;
    } else {
      newLow = mid + 1;
    }

    if (newLow >= newHigh) {
      setInsertIndex(newLow);
      setComparing(false);
      setStep("done");
      return;
    }

    setLow(newLow);
    setHigh(newHigh);
    setMid(Math.floor((newLow + newHigh) / 2));
    setComparing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await api.solo.rank(movie.id, insertIndex);
    if (res.data) {
      onRanked?.(res.data);
      toast.success(`${movie.title} ranked #${insertIndex + 1}`);
    } else if (res.error) {
      toast.error(res.error);
    }
    setSaving(false);
    onClose();
  };

  useEffect(() => {
    if (step === "done") {
      handleSave();
    }
  }, [step]);

  if (!open) return null;

  const poster = getPosterUrl(movie.posterPath, "large");
  const year = movie.releaseDate?.split("-")[0] ?? "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-lg"
      >
        {step === "triage" && (
          <div className="flex flex-col items-center">
            <div className="w-[140px] aspect-[2/3] rounded-sm overflow-hidden mb-4">
              {poster ? (
                <Image src={poster} alt={movie.title} width={140} height={210} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#111]" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-[#e8e8e8] text-center">{movie.title}</h2>
            {year && <p className="text-sm text-[#888] mt-0.5">{year}</p>}
            <p className="text-xs text-[#888] mt-4 mb-6">How did you feel about it?</p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {TRIAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.zone}
                  onClick={() => handleTriage(opt.zone)}
                  className="flex items-center gap-2 rounded-lg bg-[#111] px-4 py-3 text-sm text-[#e8e8e8] transition-colors hover:bg-[#1a1a1a] active:bg-[#222]"
                >
                  <span className="text-lg">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            {rankings.length === 0 && (
              <p className="text-xs text-[#888] mt-4">This will be your first ranked movie!</p>
            )}
            <button onClick={onSkip ?? onClose} className="mt-6 text-xs text-[#888] hover:text-[#aaa] transition-colors">
              Skip ranking
            </button>
          </div>
        )}

        {step === "compare" && rankings[mid] && (
          <div className="flex flex-col items-center">
            <p className="text-xs text-[#888] mb-6">Which do you prefer?</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={mid}
                className="flex w-full flex-col items-center gap-4 md:flex-row md:justify-center md:gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  onClick={() => handleCompare(true)}
                  disabled={comparing}
                  className="group flex w-full max-w-[200px] flex-col items-center disabled:pointer-events-none"
                >
                  <div
                    className="relative aspect-[2/3] w-full overflow-hidden rounded-sm"
                    style={{
                      borderWidth: 2,
                      borderStyle: "solid",
                      borderColor: flashId === movie.id ? "#ff2d55" : "transparent",
                    }}
                  >
                    {poster ? (
                      <Image src={poster} alt={movie.title} fill className="object-cover group-hover:opacity-80 transition-opacity" sizes="200px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#111] text-xs text-[#888]">No poster</div>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#e8e8e8] text-center">{movie.title}</p>
                  {year && <p className="text-xs text-[#888]">{year}</p>}
                </button>

                <span className="text-xs text-[#888] font-medium">or</span>

                <button
                  onClick={() => handleCompare(false)}
                  disabled={comparing}
                  className="group flex w-full max-w-[200px] flex-col items-center disabled:pointer-events-none"
                >
                  {(() => {
                    const cmpMovie = rankings[mid].movie;
                    const cmpPoster = getPosterUrl(cmpMovie.posterPath, "large");
                    const cmpYear = cmpMovie.releaseDate?.split("-")[0] ?? "";
                    return (
                      <>
                        <div
                          className="relative aspect-[2/3] w-full overflow-hidden rounded-sm"
                          style={{
                            borderWidth: 2,
                            borderStyle: "solid",
                            borderColor: flashId === cmpMovie.id ? "#ff2d55" : "transparent",
                          }}
                        >
                          {cmpPoster ? (
                            <Image src={cmpPoster} alt={cmpMovie.title} fill className="object-cover group-hover:opacity-80 transition-opacity" sizes="200px" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#111] text-xs text-[#888]">No poster</div>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-medium text-[#e8e8e8] text-center">{cmpMovie.title}</p>
                        {cmpYear && <p className="text-xs text-[#888]">{cmpYear}</p>}
                      </>
                    );
                  })()}
                </button>
              </motion.div>
            </AnimatePresence>
            <p className="mt-4 text-xs text-[#888] tabular-nums">
              {Math.ceil(Math.log2(high - low + 1))} comparison{Math.ceil(Math.log2(high - low + 1)) !== 1 ? "s" : ""} remaining
            </p>
            <button onClick={onSkip ?? onClose} className="mt-4 text-xs text-[#888] hover:text-[#aaa] transition-colors">
              Skip ranking
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center">
            <div className="w-[120px] aspect-[2/3] rounded-sm overflow-hidden mb-4">
              {poster ? (
                <Image src={poster} alt={movie.title} width={120} height={180} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#111]" />
              )}
            </div>
            <p className="text-sm text-[#888]">{saving ? "Saving..." : "Ranked!"}</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
