import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface FeedItem {
  id: string;
  userId: string;
  movieId: number;
  rating: number | null;
  friend: { displayName: string; photoUrl: string | null };
  movie: { id: number; title: string; posterPath: string };
  watchedAt?: string | null;
  createdAt?: string | null;
}

interface FriendActivityScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

function getRelativeTime(item: FeedItem): string {
  const raw = item.watchedAt ?? item.createdAt;
  if (!raw) return '';
  const now = Date.now();
  const then = new Date(raw as string).getTime();
  if (Number.isNaN(then)) return '';
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function FriendActivityScreen({ navigation }: FriendActivityScreenProps) {
  const { getIdToken } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const token = await getIdToken();
      const res = await api.social.feed(token);
      if (res.data && Array.isArray(res.data)) setFeed(res.data as FeedItem[]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (feed.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyText}>
          No activity yet. Add some friends to see what they're watching!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={feed}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      renderItem={({ item }) => {
        const poster = getPosterUrl(item.movie.posterPath, 'small');
        const initial = (item.friend.displayName ?? '?')[0]?.toUpperCase();
        const timeLabel = getRelativeTime(item);
        return (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => navigation.navigate('FriendProfile', { userId: item.userId })}
              activeOpacity={0.75}
            >
              <View style={styles.avatar}>
                {item.friend.photoUrl ? (
                  <OptimizedImage uri={item.friend.photoUrl} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>{initial}</Text>
                )}
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.friendName}>{item.friend.displayName}</Text>
                {timeLabel ? <Text style={styles.timeText}>{timeLabel}</Text> : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardBody}
              onPress={() => navigation.navigate('MovieDetail', { movieId: item.movie.id })}
              activeOpacity={0.75}
            >
              {poster ? <OptimizedImage uri={poster} style={styles.poster} /> : null}
              <View style={styles.movieInfo}>
                <Text style={styles.movieTitle} numberOfLines={2}>{item.movie.title}</Text>
                {item.rating != null && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color={colors.accent} />
                    <Text style={styles.ratingText}>{item.rating}/10</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1,
  },
  cardBody: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  movieInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceVariant,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 32,
    height: 32,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: borderRadius.xs,
  },
  friendName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
});
