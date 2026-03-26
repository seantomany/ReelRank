import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { colors, spacing, borderRadius } from '../theme';
import type { SoloInsights } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface StatsScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

function StatCard({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <View style={statStyles.card}>
      <Text style={[statStyles.value, accent && { color: colors.accent }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function HorizontalBar({ label, value, maxValue, showValue }: { label: string; value: number; maxValue: number; showValue?: string }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label} numberOfLines={1}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${Math.max(pct, 2)}%` }]} />
      </View>
      <Text style={barStyles.value}>{showValue ?? value}</Text>
    </View>
  );
}

function RatingBar({ label, value, maxValue, displayValue }: { label: string; value: number; maxValue: number; displayValue: string }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label} numberOfLines={1}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${Math.max(pct, 2)}%` }]} />
      </View>
      <Text style={[barStyles.value, { color: colors.accent }]}>{displayValue}</Text>
    </View>
  );
}

export function StatsScreen({ navigation }: StatsScreenProps) {
  const { getIdToken } = useAuth();
  const [insights, setInsights] = useState<SoloInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const token = await getIdToken();
      const res = await api.solo.insights(token);
      if (res.data) setInsights(res.data as SoloInsights);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!insights) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bar-chart-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No data yet</Text>
        <Text style={styles.emptySubtitle}>
          Start swiping and watching movies to see your stats
        </Text>
      </View>
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
  const maxGenreCount = Math.max(...genreBreakdown.slice(0, 8).map((g) => g.rightCount), 1);
  const maxRating = 10;
  const maxDecade = Math.max(...decadeBreakdown.map((d) => d.count), 1);
  const maxRatingDist = Math.max(...ratingDistribution.map((r) => r.count), 1);
  const maxDayCount = Math.max(...dayOfWeekActivity.map((d) => d.count), 1);
  const maxMonthCount = Math.max(...watchPatterns.map((w) => w.count), 1);
  const maxVenue = Math.max(...venueBreakdown.map((v) => v.count), 1);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Movie Personality */}
      <View style={styles.personalityCard}>
        <Text style={styles.personalityTitle}>{moviePersonality.title}</Text>
        <Text style={styles.personalityDesc}>{moviePersonality.description}</Text>
        {moviePersonality.traits.length > 0 && (
          <View style={styles.traitsRow}>
            {moviePersonality.traits.map((trait) => (
              <View key={trait} style={styles.traitChip}>
                <Text style={styles.traitText}>{trait}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Swipe Overview */}
      {hasSwipes && (
        <Section title="Swipe Overview">
          <View style={styles.statGrid}>
            <StatCard value={swipeRate.rightSwipes} label="Right swipes" accent />
            <StatCard value={swipeRate.leftSwipes} label="Left swipes" />
            <StatCard value={`${swipeRate.ratio}%`} label="Want rate" />
          </View>
        </Section>
      )}

      {/* Genre Taste Profile */}
      {genreBreakdown.length > 0 && (
        <Section title="Genre Taste Profile">
          {genreBreakdown.slice(0, 8).map((g) => (
            <HorizontalBar
              key={g.genreId}
              label={g.genreName}
              value={g.rightCount}
              maxValue={maxGenreCount}
            />
          ))}
        </Section>
      )}

      {/* Genres by Your Rating */}
      {ratingByGenre.length > 0 && (
        <Section title="Genres by Your Rating">
          {ratingByGenre.slice(0, 8).map((g) => (
            <RatingBar
              key={g.genreId}
              label={g.genreName}
              value={g.avgRating}
              maxValue={maxRating}
              displayValue={g.avgRating.toFixed(1)}
            />
          ))}
        </Section>
      )}

      {/* Decade Breakdown */}
      {decadeBreakdown.length > 0 && (
        <Section title="Decades">
          {decadeBreakdown.map((d) => (
            <HorizontalBar
              key={d.decade}
              label={d.decade}
              value={d.count}
              maxValue={maxDecade}
            />
          ))}
        </Section>
      )}

      {/* Rating Distribution */}
      {ratingDistribution.length > 0 && ratingDistribution.some((b) => b.count > 0) && (
        <Section title="Rating Distribution">
          {ratingDistribution.map((r) => (
            <HorizontalBar
              key={r.bucket}
              label={String(r.bucket)}
              value={r.count}
              maxValue={maxRatingDist}
            />
          ))}
        </Section>
      )}

      {/* Watch Habits */}
      {dayOfWeekActivity.some((d) => d.count > 0) && (
        <Section title="Watch Habits">
          {dayOfWeekActivity.map((d) => (
            <HorizontalBar
              key={d.day}
              label={d.day}
              value={d.count}
              maxValue={maxDayCount}
            />
          ))}
        </Section>
      )}

      {/* Watch Activity */}
      {watchPatterns.length > 0 && (
        <Section title="Watch Activity">
          {watchPatterns.map((w) => (
            <HorizontalBar
              key={w.month}
              label={w.month}
              value={w.count}
              maxValue={maxMonthCount}
            />
          ))}
        </Section>
      )}

      {/* Where You Watch */}
      {venueBreakdown.length > 0 && (
        <Section title="Where You Watch">
          {venueBreakdown.map((v) => (
            <HorizontalBar
              key={v.venue}
              label={v.venue}
              value={v.count}
              maxValue={maxVenue}
            />
          ))}
        </Section>
      )}

      {/* Crowd Agreement */}
      {crowdAgreement.movies.length > 0 && (
        <Section title="You vs. the Crowd">
          <View style={styles.crowdCard}>
            <Text style={styles.crowdDiff}>
              {crowdAgreement.avgDiff > 0 ? '+' : ''}
              {crowdAgreement.avgDiff}
            </Text>
            <Text style={styles.crowdLabel}>average deviation from TMDB ratings</Text>
            <Text style={styles.crowdDesc}>
              {crowdAgreement.avgDiff > 1
                ? "You rate movies higher than the crowd on average"
                : crowdAgreement.avgDiff < -1
                  ? "You're a tougher critic than most"
                  : "Your taste aligns closely with the crowd"}
            </Text>
          </View>
          {crowdAgreement.movies.slice(0, 10).map((m) => (
            <View key={m.movieId} style={styles.crowdRow}>
              <Text style={styles.crowdMovieTitle} numberOfLines={1}>{m.title}</Text>
              <Text style={styles.crowdRating}>{m.userRating}</Text>
              <Text style={styles.crowdVs}>vs</Text>
              <Text style={styles.crowdTmdb}>{m.tmdbRating}</Text>
              <Text
                style={[
                  styles.crowdDiffSmall,
                  m.diff > 0 && { color: colors.success },
                  m.diff < 0 && { color: colors.error },
                ]}
              >
                {m.diff > 0 ? '+' : ''}{m.diff}
              </Text>
            </View>
          ))}
        </Section>
      )}

      {/* Watchlist Funnel */}
      {watchlistConversion.rightSwiped > 0 && (
        <Section title="Watchlist Funnel">
          <View style={styles.funnelCard}>
            <View style={styles.funnelRing}>
              <Text style={styles.funnelRate}>{watchlistConversion.rate}%</Text>
            </View>
            <View style={styles.funnelInfo}>
              <Text style={styles.funnelText}>
                Watched{' '}
                <Text style={{ color: colors.accent, fontWeight: '600' }}>
                  {watchlistConversion.watched}
                </Text>{' '}
                of{' '}
                <Text style={{ fontWeight: '600' }}>
                  {watchlistConversion.rightSwiped}
                </Text>{' '}
                wanted movies
              </Text>
              <Text style={styles.funnelSubtext}>
                {watchlistConversion.rate >= 50
                  ? 'Great follow-through on your watchlist!'
                  : watchlistConversion.rate >= 20
                    ? "You've got a solid backlog to work through"
                    : 'So many movies, so little time'}
              </Text>
            </View>
          </View>
        </Section>
      )}

      {/* Top Genres by Score */}
      {topGenresByScore.length > 0 && (
        <Section title="Top Genres by Score">
          {topGenresByScore.slice(0, 6).map((g) => (
            <RatingBar
              key={g.genreId}
              label={g.genreName}
              value={g.avgScore}
              maxValue={10}
              displayValue={String(g.avgScore)}
            />
          ))}
        </Section>
      )}

      <View style={{ height: spacing.xxl * 2 }} />
    </ScrollView>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    width: 80,
    fontSize: 12,
    color: colors.text,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  value: {
    width: 36,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  personalityCard: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  personalityTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  personalityDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  traitChip: {
    backgroundColor: `${colors.accent}18`,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
    borderRadius: 20,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  traitText: {
    fontSize: 11,
    color: colors.text,
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  crowdCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  crowdDiff: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  crowdLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  crowdDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  crowdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  crowdMovieTitle: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginRight: spacing.sm,
  },
  crowdRating: {
    fontSize: 12,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  crowdVs: {
    fontSize: 10,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
  crowdTmdb: {
    fontSize: 12,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  crowdDiffSmall: {
    width: 36,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  funnelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  funnelRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  funnelRate: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  funnelInfo: {
    flex: 1,
  },
  funnelText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  funnelSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
