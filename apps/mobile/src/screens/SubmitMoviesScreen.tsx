import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { api } from '../utils/api';
import { MovieSearchBar } from '../components/MovieSearchBar';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl, ROOM_MAX_MOVIES } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { Movie } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useEffect } from 'react';

interface SubmitMoviesScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
}

export function SubmitMoviesScreen({ navigation, route }: SubmitMoviesScreenProps) {
  const { roomCode } = route.params as { roomCode: string };
  const { user: authUser, getIdToken } = useAuth();
  const { room } = useRoom(roomCode);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (room?.status === 'swiping') {
      navigation.replace('GroupSwipe', { roomCode });
    } else if (room?.status === 'results') {
      navigation.replace('GroupResults', { roomCode });
    }
  }, [room?.status, navigation, roomCode]);

  const handleSubmitMovie = useCallback(async (movie: Movie) => {
    try {
      const token = await getIdToken();
      const res = await api.rooms.submit(roomCode, movie.id, token);
      if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      } else {
        setSnackbar({ visible: true, message: `${movie.title} added!` });
      }
    } catch (error) {
      console.error('Failed to submit movie:', error);
      setSnackbar({ visible: true, message: 'Failed to submit movie' });
    }
  }, [roomCode, getIdToken]);

  const handleRemoveMovie = useCallback(async (movieId: number, title: string) => {
    Alert.alert('Remove Movie', `Remove "${title}" from the pool?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getIdToken();
            const res = await api.rooms.removeMovie(roomCode, movieId, token);
            if (res.error) {
              setSnackbar({ visible: true, message: res.error });
            } else {
              setSnackbar({ visible: true, message: 'Movie removed' });
            }
          } catch (error) {
            console.error('Failed to remove movie:', error);
            setSnackbar({ visible: true, message: 'Failed to remove movie' });
          }
        },
      },
    ]);
  }, [roomCode, getIdToken]);

  const handleStartSwiping = useCallback(async () => {
    setStarting(true);
    try {
      const token = await getIdToken();
      const res = await api.rooms.start(roomCode, 'swiping', token);
      if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      }
    } catch (error) {
      console.error('Failed to start swiping:', error);
      setSnackbar({ visible: true, message: 'Failed to start swiping' });
    } finally {
      setStarting(false);
    }
  }, [roomCode, getIdToken]);

  const movies = (room?.movies ?? []) as any[];
  const totalMovies = movies.length;
  const isHost = room?.hostId === authUser?.uid;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Submit Movies</Text>
        <Text style={styles.count}>
          {totalMovies} / {ROOM_MAX_MOVIES} movies
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <MovieSearchBar onSelect={handleSubmitMovie} placeholder="Search and add movies..." />
      </View>

      <FlatList
        data={movies}
        keyExtractor={(item) => String(item.movieId ?? item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const movie = item.movie;
          return (
            <View style={styles.movieRow}>
              <OptimizedImage
                uri={movie ? getPosterUrl(movie.posterPath, 'small') : null}
                style={styles.poster}
              />
              <Text style={styles.movieTitle} numberOfLines={1}>
                {movie?.title ?? `Movie #${item.movieId}`}
              </Text>
              {(item.submittedByUserId === authUser?.uid || isHost) && (
                <TouchableOpacity
                  onPress={() => handleRemoveMovie(item.movieId, movie?.title ?? 'this movie')}
                  style={styles.removeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="film-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No movies yet. Search and add some!</Text>
          </View>
        }
      />

      {isHost && totalMovies >= 1 && totalMovies < 2 && (
        <View style={styles.bottomSection}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
            Add at least 2 movies to start swiping
          </Text>
        </View>
      )}
      {isHost && totalMovies >= 2 && (
        <View style={styles.bottomSection}>
          <Button
            mode="contained"
            onPress={handleStartSwiping}
            loading={starting}
            disabled={starting}
            style={styles.startButton}
            labelStyle={styles.startLabel}
          >
            Start Swiping ({totalMovies} movies)
          </Button>
        </View>
      )}

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={2000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  count: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
  },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  poster: {
    width: 36,
    height: 54,
    borderRadius: borderRadius.sm,
  },
  movieTitle: {
    color: colors.text,
    fontSize: 15,
    marginLeft: spacing.md,
    flex: 1,
  },
  removeButton: {
    padding: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  bottomSection: {
    padding: spacing.lg,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
  },
  startLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
