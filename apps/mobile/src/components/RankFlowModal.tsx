import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from './OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { Movie, SoloRanking } from '@reelrank/shared';

type TriageZone = 'loved' | 'liked' | 'okay' | 'disliked';
type Step = 'triage' | 'compare' | 'done';

interface RankFlowModalProps {
  movie: Movie;
  visible: boolean;
  onClose: () => void;
  onRanked?: (rankings: SoloRanking[]) => void;
  rating?: number;
}

function ratingToZone(rating: number): TriageZone {
  if (rating >= 9) return 'loved';
  if (rating >= 7) return 'liked';
  if (rating >= 5) return 'okay';
  return 'disliked';
}

function getTriageRange(zone: TriageZone, total: number): [number, number] {
  if (total === 0) return [0, 0];
  const quarter = Math.ceil(total / 4);
  switch (zone) {
    case 'loved': return [0, Math.min(quarter, total)];
    case 'liked': return [quarter, Math.min(quarter * 2, total)];
    case 'okay': return [quarter * 2, Math.min(quarter * 3, total)];
    case 'disliked': return [quarter * 3, total];
  }
}

const TRIAGE_OPTIONS: { zone: TriageZone; label: string; emoji: string }[] = [
  { zone: 'loved', label: 'Loved it', emoji: '🤩' },
  { zone: 'liked', label: 'Liked it', emoji: '😊' },
  { zone: 'okay', label: 'It was okay', emoji: '😐' },
  { zone: 'disliked', label: "Didn't like it", emoji: '😕' },
];

export function RankFlowModal({ movie, visible, onClose, onRanked, rating }: RankFlowModalProps) {
  const { getIdToken } = useAuth();
  const [step, setStep] = useState<Step>('triage');
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(0);
  const [mid, setMid] = useState(0);
  const [comparing, setComparing] = useState(false);
  const [insertIndex, setInsertIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [rankingsLoaded, setRankingsLoaded] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep('triage');
      setRankings([]);
      setRankingsLoaded(false);
      setLow(0);
      setHigh(0);
      setMid(0);
      return;
    }

    (async () => {
      try {
        const token = await getIdToken();
        const res = await api.solo.ranking(token);
        if (res.data) setRankings(res.data as SoloRanking[]);
      } catch {}
      setRankingsLoaded(true);
    })();
  }, [visible]);

  const startCompare = useCallback((zone: TriageZone) => {
    if (rankings.length === 0) {
      setInsertIndex(0);
      setStep('done');
      return;
    }

    const [lo, hi] = getTriageRange(zone, rankings.length);
    if (lo >= hi) {
      setInsertIndex(lo);
      setStep('done');
      return;
    }

    setLow(lo);
    setHigh(hi);
    const m = Math.floor((lo + hi) / 2);
    setMid(m);
    setStep('compare');
  }, [rankings]);

  useEffect(() => {
    if (!visible || !rankingsLoaded || step !== 'triage' || rating == null) return;
    const zone = ratingToZone(rating);
    startCompare(zone);
  }, [visible, rankingsLoaded, rating, step, startCompare]);

  const handleCompare = async (preferNew: boolean) => {
    if (comparing) return;
    setComparing(true);

    if (rankings[mid]) {
      try {
        const token = await getIdToken();
        const chosenId = preferNew ? movie.id : rankings[mid].movieId;
        await api.solo.pairwise(movie.id, rankings[mid].movieId, chosenId, token);
      } catch {}
    }

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
      setStep('done');
      return;
    }

    setLow(newLow);
    setHigh(newHigh);
    setMid(Math.floor((newLow + newHigh) / 2));
    setComparing(false);
  };

  useEffect(() => {
    if (step !== 'done') return;
    (async () => {
      setSaving(true);
      try {
        const token = await getIdToken();
        const res = await api.solo.rank(movie.id, insertIndex, token);
        if (res.data) {
          onRanked?.(res.data as SoloRanking[]);
        }
      } catch {}
      setSaving(false);
      onClose();
    })();
  }, [step]);

  if (!visible) return null;

  const poster = getPosterUrl(movie.posterPath, 'large');
  const year = movie.releaseDate?.split('-')[0] ?? '';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          {step === 'triage' && (
            <View style={styles.center}>
              <OptimizedImage uri={poster} style={styles.poster} />
              <Text style={styles.movieTitle}>{movie.title}</Text>
              {year ? <Text style={styles.year}>{year}</Text> : null}
              {rating != null ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.hint}>Finding the right spot...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.hint}>How did you feel about it?</Text>
                  <View style={styles.triageGrid}>
                    {TRIAGE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.zone}
                        style={styles.triageButton}
                        onPress={() => startCompare(opt.zone)}
                      >
                        <Text style={styles.triageEmoji}>{opt.emoji}</Text>
                        <Text style={styles.triageLabel}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {rankings.length === 0 && (
                    <Text style={styles.firstRank}>This will be your first ranked movie!</Text>
                  )}
                </>
              )}
              <TouchableOpacity onPress={onClose} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip ranking</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'compare' && rankings[mid] && (
            <View style={styles.center}>
              <Text style={styles.hint}>Which do you prefer?</Text>
              <View style={styles.compareRow}>
                <TouchableOpacity
                  style={styles.compareCard}
                  onPress={() => handleCompare(true)}
                  disabled={comparing}
                  activeOpacity={0.7}
                >
                  <OptimizedImage uri={poster} style={styles.comparePoster} />
                  <Text style={styles.compareTitle} numberOfLines={2}>{movie.title}</Text>
                </TouchableOpacity>

                <Text style={styles.orText}>or</Text>

                <TouchableOpacity
                  style={styles.compareCard}
                  onPress={() => handleCompare(false)}
                  disabled={comparing}
                  activeOpacity={0.7}
                >
                  <OptimizedImage
                    uri={getPosterUrl(rankings[mid].movie.posterPath, 'large')}
                    style={styles.comparePoster}
                  />
                  <Text style={styles.compareTitle} numberOfLines={2}>
                    {rankings[mid].movie.title}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.remaining}>
                {Math.ceil(Math.log2(high - low + 1))} comparison
                {Math.ceil(Math.log2(high - low + 1)) !== 1 ? 's' : ''} remaining
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip ranking</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'done' && (
            <View style={styles.center}>
              <OptimizedImage uri={poster} style={styles.smallPoster} />
              <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: spacing.md }} />
              <Text style={styles.hint}>{saving ? 'Saving...' : 'Ranked!'}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  center: {
    alignItems: 'center',
  },
  poster: {
    width: 140,
    height: 210,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  smallPoster: {
    width: 100,
    height: 150,
    borderRadius: borderRadius.sm,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  year: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  triageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  triageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    width: '47%',
  },
  triageEmoji: {
    fontSize: 20,
  },
  triageLabel: {
    fontSize: 14,
    color: colors.text,
  },
  firstRank: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  skipButton: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  skipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  compareCard: {
    flex: 1,
    alignItems: 'center',
  },
  comparePoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: borderRadius.sm,
  },
  compareTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  orText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  remaining: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontVariant: ['tabular-nums'],
  },
});
