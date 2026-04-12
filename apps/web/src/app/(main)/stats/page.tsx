"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { SoloInsights } from "@reelrank/shared";
import { ArrowLeft } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_TOOLTIP = {
  contentStyle: {
    background: "#111",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#e8e8e8",
    fontSize: 12,
  },
};

const PIE_COLORS = ["#ff2d55", "#e0264b", "#bf1f3f", "#991933", "#731326", "#4d0e1a"];

export default function StatsPage() {
  const [insights, setInsights] = useState<SoloInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.solo.insights().then((res) => {
      if (res.data) setInsights(res.data);
      else if (res.error) setError(res.error);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/profile" className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#e8e8e8] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Profile
        </Link>
        <div className="py-20 text-center">
          {error ? (
            <>
              <p className="text-sm text-red-400">Failed to load stats</p>
              <p className="text-xs text-[#888] mt-1">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  api.solo.insights().then((res) => {
                    if (res.data) setInsights(res.data);
                    else if (res.error) setError(res.error);
                  }).finally(() => setLoading(false));
                }}
                className="mt-3 text-sm text-[#ff2d55] hover:text-[#e8e8e8] transition-colors underline underline-offset-2"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[#888]">No data yet</p>
              <p className="text-xs text-[#888] mt-1">Start swiping and watching movies to see your stats</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const {
    moviePersonality,
    swipeRate,
    genreBreakdown,
    ratingByGenre,
    decadeBreakdown,
    ratingDistribution,
    dayOfWeekActivity,
    watchPatterns,
    venueBreakdown,
    crowdAgreement,
    watchlistConversion,
    topGenresByScore,
  } = insights;

  const hasSwipes = swipeRate.rightSwipes + swipeRate.leftSwipes > 0;
  const hasWatched = watchPatterns.length > 0 || venueBreakdown.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <Link href="/profile" className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#e8e8e8] transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Profile
      </Link>

      {/* 1. Movie Personality */}
      <div className="rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)] p-5 mb-8">
        <p className="text-xl font-semibold text-[#e8e8e8]">{moviePersonality.title}</p>
        <p className="text-sm text-[#888] mt-1 leading-relaxed">{moviePersonality.description}</p>
        {moviePersonality.traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {moviePersonality.traits.map((trait) => (
              <span
                key={trait}
                className="text-[11px] text-[#e8e8e8] bg-[rgba(255,45,85,0.12)] border border-[rgba(255,45,85,0.2)] rounded-full px-2.5 py-1"
              >
                {trait}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Swipe Overview */}
      {hasSwipes && (
        <Section title="Swipe Overview">
          <div className="grid grid-cols-3 gap-3">
            <StatCard value={swipeRate.rightSwipes} label="Right swipes" accent />
            <StatCard value={swipeRate.leftSwipes} label="Left swipes" />
            <StatCard value={`${swipeRate.ratio}%`} label="Want rate" />
          </div>
        </Section>
      )}

      {/* 3. Genre Taste Profile */}
      {genreBreakdown.length > 0 && (
        <Section title="Genre Taste Profile">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={genreBreakdown.slice(0, 8)}
                layout="vertical"
                margin={{ left: 80, right: 10, top: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="genreName"
                  tick={{ fill: "#888", fontSize: 11 }}
                  width={80}
                />
                <Tooltip {...CHART_TOOLTIP} formatter={(value) => [`${value} swipes`, "Right"]} />
                <Bar dataKey="rightCount" fill="#ff2d55" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* 4. Top Genres by Your Rating */}
      {ratingByGenre.length > 0 && (
        <Section title="Genres by Your Rating">
          <div className="space-y-2.5">
            {ratingByGenre.slice(0, 8).map((g) => (
              <div key={g.genreId} className="flex items-center gap-3">
                <span className="text-sm text-[#e8e8e8] w-28 truncate">{g.genreName}</span>
                <div className="flex-1 h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff2d55] rounded-full transition-all"
                    style={{ width: `${g.avgRating * 10}%` }}
                  />
                </div>
                <span className="text-xs text-[#ff2d55] tabular-nums w-10 text-right font-medium">
                  {g.avgRating.toFixed(1)}
                </span>
                <span className="text-[10px] text-[#888] tabular-nums w-6 text-right">
                  ({g.count})
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 5. Decade Breakdown */}
      {decadeBreakdown.length > 0 && (
        <Section title="Decades">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={decadeBreakdown}
                margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
              >
                <XAxis dataKey="decade" tick={{ fill: "#888", fontSize: 10 }} />
                <YAxis hide />
                <Tooltip {...CHART_TOOLTIP} formatter={(value) => [`${value} movies`]} />
                <Bar dataKey="count" fill="#ff2d55" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* 6. Rating Distribution */}
      {ratingDistribution.length > 0 && ratingDistribution.some((b) => b.count > 0) && (
        <Section title="Rating Distribution">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ratingDistribution}
                margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
              >
                <XAxis dataKey="bucket" tick={{ fill: "#888", fontSize: 10 }} />
                <YAxis hide />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="count" fill="#ff2d55" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-[#888] mt-1 text-center">Score distribution</p>
        </Section>
      )}

      {/* 7. Watch Habits: Day of Week */}
      {dayOfWeekActivity.some((d) => d.count > 0) && (
        <Section title="Watch Habits">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dayOfWeekActivity}
                margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
              >
                <XAxis dataKey="day" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis hide />
                <Tooltip {...CHART_TOOLTIP} formatter={(value) => [`${value} movies`]} />
                <Bar dataKey="count" fill="#ff2d55" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-[#888] mt-1 text-center">Movies watched by day of the week</p>
        </Section>
      )}

      {/* 8. Watch Activity (monthly) */}
      {watchPatterns.length > 0 && (
        <Section title="Watch Activity">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={watchPatterns}
                margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
              >
                <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 10 }} />
                <YAxis hide />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value, name) => [String(value), name === "count" ? "Movies" : "Avg Rating"]}
                />
                <Bar dataKey="count" fill="#ff2d55" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* 9. Where You Watch */}
      {venueBreakdown.length > 0 && (
        <Section title="Where You Watch">
          <div className="h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={venueBreakdown}
                  dataKey="count"
                  nameKey="venue"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {venueBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* 10. Crowd Agreement */}
      {crowdAgreement.movies.length > 0 && (
        <Section title="You vs. the Crowd">
          <div className="rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)] p-4 mb-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[#e8e8e8] tabular-nums">
                {crowdAgreement.avgDiff > 0 ? "+" : ""}{crowdAgreement.avgDiff}
              </p>
              <p className="text-xs text-[#888]">average deviation from TMDB ratings</p>
            </div>
            <p className="text-[11px] text-[#888] mt-1">
              {crowdAgreement.avgDiff > 1
                ? "You rate movies higher than the crowd on average"
                : crowdAgreement.avgDiff < -1
                  ? "You're a tougher critic than most"
                  : "Your taste aligns closely with the crowd"}
            </p>
          </div>
          <div className="space-y-1">
            {crowdAgreement.movies.slice(0, 10).map((m) => (
              <Link
                key={m.movieId}
                href={`/movie/${m.movieId}`}
                className="flex items-center justify-between py-1.5 group"
              >
                <span className="text-sm text-[#e8e8e8] truncate flex-1 min-w-0 group-hover:text-[#ff2d55] transition-colors">
                  {m.title}
                </span>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs text-[#e8e8e8] tabular-nums">{m.userRating}</span>
                  <span className="text-[10px] text-[#888]">vs</span>
                  <span className="text-xs text-[#888] tabular-nums">{m.tmdbRating}</span>
                  <span
                    className={`text-xs tabular-nums font-medium w-10 text-right ${
                      m.diff > 0 ? "text-green-400" : m.diff < 0 ? "text-red-400" : "text-[#888]"
                    }`}
                  >
                    {m.diff > 0 ? "+" : ""}{m.diff}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 11. Watchlist Funnel */}
      {watchlistConversion.rightSwiped > 0 && (
        <Section title="Watchlist Funnel">
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke="#111"
                  strokeWidth="3"
                />
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke="#ff2d55"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${watchlistConversion.rate * 0.974} 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-semibold text-[#e8e8e8] tabular-nums">{watchlistConversion.rate}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-[#e8e8e8]">
                Watched <span className="text-[#ff2d55] font-semibold">{watchlistConversion.watched}</span> of{" "}
                <span className="font-semibold">{watchlistConversion.rightSwiped}</span> wanted movies
              </p>
              <p className="text-xs text-[#888] mt-1">
                {watchlistConversion.rate >= 50
                  ? "Great follow-through on your watchlist!"
                  : watchlistConversion.rate >= 20
                    ? "You've got a solid backlog to work through"
                    : "So many movies, so little time"}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Top Genres by Score */}
      {topGenresByScore.length > 0 && (
        <Section title="Top Genres by Score">
          <div className="space-y-2">
            {topGenresByScore.slice(0, 6).map((g) => (
              <div key={g.genreId} className="flex items-center gap-3">
                <span className="text-sm text-[#e8e8e8] w-28 truncate">{g.genreName}</span>
                <div className="flex-1 h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff2d55] rounded-full"
                    style={{ width: `${g.avgScore * 10}%` }}
                  />
                </div>
                <span className="text-xs text-[#ff2d55] tabular-nums w-8 text-right">{g.avgScore}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-xs uppercase tracking-widest text-[#888] mb-3">{title}</p>
      {children}
    </div>
  );
}

function StatCard({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="bg-[#111] rounded-lg p-3 text-center">
      <p className={`text-xl font-semibold tabular-nums ${accent ? "text-[#ff2d55]" : "text-[#e8e8e8]"}`}>
        {value}
      </p>
      <p className="text-[10px] text-[#888] mt-0.5">{label}</p>
    </div>
  );
}
