import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { Movie } from '@reelrank/shared';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { api } from '../utils/api';
import MovieSearchBar from '../components/MovieSearchBar';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function SubmitMoviesScreen({ navigation, route }: RootStackScreenProps<'SubmitMovies'>) {
  const { roomCode } = route.params;
  const { getIdToken } = useAuth();
  const { room } = useRoom(roomCode);
  const [submittedMovies, setSubmittedMovies] = useState<Movie[]>([]);

  useEffect(() => {
    if (room?.status === 'swiping') {
      navigation.replace('GroupSwipe', { roomCode });
    } else if (room?.status === 'results') {
      navigation.replace('GroupResults', { roomCode });
    }
  }, [room?.status, roomCode, navigation]);

  const handleSelect = useCallback(
    async (movie: Movie) => {
      try {
        const token = await getIdToken();
        if (!token) return;

        await api.rooms.submitMovie(roomCode, movie.id, token);
        setSubmittedMovies((prev) => [...prev, movie]);
      } catch (error) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit');
      }
    },
    [roomCode, getIdToken],
  );

  const handleStartSwiping = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      await api.rooms.start(roomCode, 'swiping', token);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start swiping');
    }
  };

  const totalMovies = room?.movies?.length ?? submittedMovies.length;

  return (
    <View style={styles.container}>
      <MovieSearchBar onSelect={handleSelect} placeholder="Search for movies to add..." />

      <View style={styles.statusBar}>
        <Ionicons name="film" size={16} color={colors.primary} />
        <Text style={styles.statusText}>{totalMovies} movies submitted</Text>
      </View>

      <FlatList
        data={submittedMovies}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Add movies for the group</Text>
            <Text style={styles.emptySubtitle}>
              Search above to submit candidates everyone will vote on
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const posterUri = item.posterPath
            ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.small}${item.posterPath}`
            : null;

          return (
            <View style={styles.movieRow}>
              {posterUri ? (
                <Image source={{ uri: posterUri }} style={styles.poster} />
              ) : (
                <View style={[styles.poster, styles.noPoster]}>
                  <Ionicons name="film-outline" size={16} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.movieInfo}>
                <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.movieMeta}>
                  {item.releaseDate?.slice(0, 4)} · ★ {item.voteAverage.toFixed(1)}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            </View>
          );
        }}
      />

      {room?.hostId && totalMovies >= 2 && (
        <Button
          mode="contained"
          onPress={handleStartSwiping}
          buttonColor={colors.primary}
          style={styles.startButton}
          labelStyle={styles.startLabel}
          icon="play"
        >
          Start Voting ({totalMovies} movies)
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  statusText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  poster: {
    width: 40,
    height: 60,
    borderRadius: 4,
  },
  noPoster: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieInfo: {
    flex: 1,
  },
  movieTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  movieMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  startButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.md,
  },
  startLabel: {
    ...typography.label,
    fontSize: 16,
  },
});
