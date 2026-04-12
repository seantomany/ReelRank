import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput as RNTextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Avatar, ActivityIndicator, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

interface FriendProfileScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
}

interface WatchedItem {
  id: string;
  movieId: number;
  movie: any;
  rating: number;
  watchedAt: string;
  venue: string;
  notes: string | null;
}

interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  createdAt: string;
}

export function FriendProfileScreen({ navigation, route }: FriendProfileScreenProps) {
  const { userId } = route.params as { userId: string };
  const { getIdToken } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [myRankings, setMyRankings] = useState<any[]>([]);
  const [myWantList, setMyWantList] = useState<any[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Clear comment text when switching between expanded items to prevent
  // submitting a comment to the wrong item.
  useEffect(() => {
    setCommentText('');
  }, [expandedItem]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const [profileRes, rankRes, wantRes] = await Promise.all([
        api.social.getFriendProfile(userId, token),
        api.solo.ranking(token),
        api.solo.lists('want', token),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (rankRes.data && Array.isArray(rankRes.data)) setMyRankings(rankRes.data);
      if (wantRes.data && Array.isArray(wantRes.data)) setMyWantList(wantRes.data);
    } catch {
      setSnackbar({ visible: true, message: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  }, [userId, getIdToken]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const { compatScore, compatDesc, sharedWantMovies } = useMemo(() => {
    const top = profile?.topRanked ?? [];
    const myIds = myRankings.map((r: any) => r.movieId);
    const mySet = new Set(myIds);
    const friendIds = top.map((x: any) => x.movieId);
    const friendSet = new Set(friendIds);
    let intersection = 0;
    for (const id of friendSet) {
      if (mySet.has(id)) intersection += 1;
    }
    const union = new Set([...friendIds, ...myIds]).size;
    const compatScore = union === 0 ? 0 : Math.round((intersection / union) * 100);
    let compatDesc = "You'll discover new movies from each other";
    if (compatScore >= 80) compatDesc = 'You two are movie soulmates!';
    else if (compatScore >= 60) compatDesc = 'Great taste overlap!';
    else if (compatScore >= 40) compatDesc = 'Decent amount in common';
    else if (compatScore >= 20) compatDesc = 'Different but complementary tastes';

    const wantIds = new Set(myWantList.map((w: any) => w.movieId));
    const sharedWantMovies = top.filter((x: any) => wantIds.has(x.movieId));

    return { compatScore, compatDesc, sharedWantMovies };
  }, [profile, myRankings, myWantList]);

  const loadComments = async (watchedId: string) => {
    try {
      const token = await getIdToken();
      const res = await api.social.getComments(watchedId, token);
      if (res.data) {
        setComments((prev) => ({ ...prev, [watchedId]: res.data as Comment[] }));
      }
    } catch {
      // ignore
    }
  };

  const handleAddComment = async (watchedId: string) => {
    if (!commentText.trim()) return;
    try {
      const token = await getIdToken();
      const res = await api.social.addComment(watchedId, userId, commentText.trim(), token);
      if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      } else {
        setCommentText('');
        loadComments(watchedId);
        setSnackbar({ visible: true, message: 'Comment added!' });
      }
    } catch {
      setSnackbar({ visible: true, message: 'Failed to add comment' });
    }
  };

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {profile.photoUrl ? (
            <Avatar.Image size={70} source={{ uri: profile.photoUrl }} />
          ) : (
            <Avatar.Text size={70} label={profile.displayName?.charAt(0)?.toUpperCase() ?? '?'} />
          )}
          <Text style={styles.name}>{profile.displayName}</Text>
        </View>

        {profile.stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profile.stats?.totalSwipes ?? 0}</Text>
              <Text style={styles.statLabel}>Swipes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profile.stats?.moviesWatched ?? 0}</Text>
              <Text style={styles.statLabel}>Watched</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profile.stats?.likeRate ?? 0}%</Text>
              <Text style={styles.statLabel}>Like Rate</Text>
            </View>
          </View>
        )}

        {/* Taste Compatibility */}
        {(profile.topRanked?.length ?? 0) > 0 && myRankings.length > 0 && (
          <View style={styles.compatCard}>
            <View style={styles.compatHeader}>
              <Ionicons name="heart-circle" size={24} color={colors.primary} />
              <Text style={styles.compatTitle}>Taste Match</Text>
            </View>
            <Text style={styles.compatScore}>{compatScore}%</Text>
            <Text style={styles.compatDesc}>{compatDesc}</Text>
          </View>
        )}

        {sharedWantMovies.length > 0 && (
          <View style={styles.sharedSection}>
            <Text style={styles.sharedTitle}>Movies You Both Want</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sharedRow}
            >
              {sharedWantMovies.map((item: any) => (
                <TouchableOpacity
                  key={item.movieId}
                  onPress={() => navigation.navigate('MovieDetail', { movieId: item.movieId })}
                  activeOpacity={0.75}
                >
                  <OptimizedImage
                    uri={getPosterUrl(item.movie?.posterPath, 'small')}
                    style={styles.sharedPoster}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Top Rankings */}
        {profile.topRanked && profile.topRanked.length > 0 && (
          <>
            <View style={styles.rankingsHeader}>
              <Text style={styles.sectionTitle}>Top Rankings</Text>
              {myRankings.length > 0 && (
                <TouchableOpacity onPress={() => setShowCompare(!showCompare)}>
                  <Text style={styles.compareToggle}>{showCompare ? 'Hide Compare' : 'Compare'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {profile.topRanked.map((item: any) => {
              const myRank = myRankings.findIndex((r: any) => r.movieId === item.movieId);
              return (
                <TouchableOpacity
                  key={item.movieId}
                  style={styles.rankRow}
                  onPress={() => navigation.navigate('MovieDetail', { movieId: item.movieId })}
                >
                  <Text style={styles.rankNum}>#{item.rank}</Text>
                  <OptimizedImage
                    uri={getPosterUrl(item.movie?.posterPath, 'small')}
                    style={styles.poster}
                  />
                  <View style={styles.rankInfo}>
                    <Text style={styles.movieTitle} numberOfLines={1}>{item.movie?.title}</Text>
                    {showCompare && (
                      <Text style={styles.compareText}>
                        {myRank >= 0 ? `Your rank: #${myRank + 1}` : 'Not in your rankings'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <Text style={styles.sectionTitle}>Recent Watches</Text>

        {!profile.recentWatched || profile.recentWatched.length === 0 ? (
          <Text style={styles.emptyText}>No watched movies yet</Text>
        ) : (
          profile.recentWatched.map((item: WatchedItem) => (
            <View key={item.id}>
              <TouchableOpacity
                style={styles.watchedRow}
                onPress={() => {
                  if (expandedItem === item.id) {
                    setExpandedItem(null);
                  } else {
                    setExpandedItem(item.id);
                    if (!comments[item.id]) loadComments(item.id);
                  }
                }}
              >
                <OptimizedImage
                  uri={getPosterUrl(item.movie?.posterPath, 'small')}
                  style={styles.poster}
                />
                <View style={styles.watchedInfo}>
                  <Text style={styles.movieTitle} numberOfLines={1}>{item.movie?.title}</Text>
                  <Text style={styles.watchedMeta}>
                    {item.rating}/10 · {item.venue}
                    {item.watchedAt ? ` · ${item.watchedAt}` : ''}
                  </Text>
                  {item.notes && <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>}
                </View>
                <Ionicons
                  name={expandedItem === item.id ? 'chatbubble' : 'chatbubble-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {expandedItem === item.id && (
                <View style={styles.commentsSection}>
                  {(comments[item.id] ?? []).map((c) => (
                    <View key={c.id} style={styles.commentRow}>
                      <Text style={styles.commentAuthor}>{c.authorName}</Text>
                      <Text style={styles.commentText}>{c.text}</Text>
                    </View>
                  ))}
                  <View style={styles.commentInput}>
                    <RNTextInput
                      style={styles.commentTextInput}
                      placeholder="Add a comment..."
                      placeholderTextColor={colors.textTertiary}
                      value={commentText}
                      onChangeText={setCommentText}
                      maxLength={280}
                    />
                    <TouchableOpacity
                      onPress={() => handleAddComment(item.id)}
                      disabled={!commentText.trim()}
                    >
                      <Ionicons
                        name="send"
                        size={20}
                        color={commentText.trim() ? colors.primary : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: spacing.xxl * 2 }} />
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  compatCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  compatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  compatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  compatScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
  },
  compatDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sharedSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sharedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sharedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sharedPoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
  },
  rankingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacing.lg,
    marginBottom: spacing.sm,
  },
  compareToggle: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rankNum: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 16,
    width: 36,
  },
  rankInfo: { flex: 1 },
  compareText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },
  watchedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  poster: {
    width: 40,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  watchedInfo: { flex: 1 },
  movieTitle: { color: colors.text, fontSize: 15, fontWeight: '500' },
  watchedMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  notes: { color: colors.textTertiary, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  commentsSection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  commentRow: {
    marginBottom: spacing.sm,
  },
  commentAuthor: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  commentText: {
    color: colors.text,
    fontSize: 14,
    marginTop: 2,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  commentTextInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    padding: 0,
  },
});
