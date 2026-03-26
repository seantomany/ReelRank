import React, { useState, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await api.social.getFriendProfile(userId, token);
      if (res.data) setProfile(res.data);
    } catch {
      setSnackbar({ visible: true, message: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  }, [userId, getIdToken]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

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

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.stats.totalSwipes}</Text>
            <Text style={styles.statLabel}>Swipes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.stats.moviesWatched}</Text>
            <Text style={styles.statLabel}>Watched</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.stats.likeRate}%</Text>
            <Text style={styles.statLabel}>Like Rate</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Watches</Text>

        {profile.recentWatched.length === 0 ? (
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
