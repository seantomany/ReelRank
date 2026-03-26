import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Chip, Snackbar, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { RankFlowModal } from '../components/RankFlowModal';
import { colors, spacing, borderRadius } from '../theme';
import type { Movie } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

const VENUES = ['Theater', 'Home', "Friend's", 'Outdoor', 'Other'] as const;

interface LogWatchedScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
}

export function LogWatchedScreen({ navigation, route }: LogWatchedScreenProps) {
  const { movieId } = route.params as { movieId: number };
  const { getIdToken } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [rating, setRating] = useState(7);
  const [venue, setVenue] = useState<string>('Home');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRankFlow, setShowRankFlow] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    loadMovie();
  }, [movieId]);

  const loadMovie = async () => {
    const res = await api.movies.getMovie(movieId);
    if (res.data) setMovie(res.data as Movie);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await api.solo.logWatched({
        movieId,
        rating,
        venue,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }, token);

      if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      } else {
        setShowRankFlow(true);
      }
    } catch (error) {
      console.error('Failed to log watched:', error);
      setSnackbar({ visible: true, message: 'Failed to save. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!movie) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{movie.title}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Rating: {rating}/10</Text>
        <View style={styles.ratingRow}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <Chip
              key={n}
              selected={n === rating}
              onPress={() => setRating(n)}
              style={[styles.ratingChip, n === rating && styles.ratingChipSelected]}
              textStyle={[styles.ratingChipText, n === rating && styles.ratingChipTextSelected]}
              compact
            >
              {String(n)}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Where did you watch?</Text>
        <View style={styles.venueChips}>
          {VENUES.map((v) => (
            <Chip
              key={v}
              selected={venue === v}
              onPress={() => setVenue(v)}
              style={[styles.venueChip, venue === v && styles.venueChipSelected]}
              textStyle={[styles.venueChipText, venue === v && styles.venueChipTextSelected]}
            >
              {v}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          mode="outlined"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder="What did you think?"
          style={styles.notesInput}
          textColor={colors.text}
          maxLength={500}
        />
      </View>

      <Button
        mode="contained"
        onPress={handleSave}
        loading={loading}
        disabled={loading}
        style={styles.saveButton}
        labelStyle={styles.saveLabel}
      >
        Save
      </Button>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>

      {movie && (
        <RankFlowModal
          movie={movie}
          visible={showRankFlow}
          onClose={() => {
            setShowRankFlow(false);
            navigation.goBack();
          }}
          rating={rating}
        />
      )}
    </ScrollView>
  );
}

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
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  ratingChip: {
    backgroundColor: colors.surfaceVariant,
  },
  ratingChipSelected: {
    backgroundColor: colors.primary,
  },
  ratingChipText: {
    color: colors.text,
  },
  ratingChipTextSelected: {
    color: colors.onPrimary,
  },
  venueChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  venueChip: {
    backgroundColor: colors.surfaceVariant,
  },
  venueChipSelected: {
    backgroundColor: colors.primary,
  },
  venueChipText: {
    color: colors.text,
  },
  venueChipTextSelected: {
    color: colors.onPrimary,
  },
  notesInput: {
    backgroundColor: colors.surface,
  },
  saveButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
  },
  saveLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
