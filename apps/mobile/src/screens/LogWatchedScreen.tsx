import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

const VENUES = [
  'Theater',
  'Netflix',
  'Hulu',
  'Disney+',
  'Amazon',
  'Apple TV+',
  'HBO Max',
  'Peacock',
  'Paramount+',
  'Other',
];

export default function LogWatchedScreen({ route, navigation }: RootStackScreenProps<'LogWatched'>) {
  const { movieId, movieTitle } = route.params;
  const { getIdToken } = useAuth();
  const [rating, setRating] = useState(7);
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [watchedAt, setWatchedAt] = useState(today);

  const handleSave = async () => {
    if (!venue) {
      Alert.alert('Missing info', 'Please select where you watched it');
      return;
    }
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      await api.solo.logWatched({ movieId, rating, watchedAt, venue, notes: notes || undefined }, token);
      await api.solo.swipe(movieId, 'right', token);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.movieName}>{movieTitle}</Text>

      <Text style={styles.sectionLabel}>Your Rating</Text>
      <View style={styles.ratingRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.ratingDot, n <= rating && styles.ratingDotActive]}
            onPress={() => setRating(n)}
          >
            <Text style={[styles.ratingNum, n <= rating && styles.ratingNumActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingLabel}>{rating}/10</Text>

      <Text style={styles.sectionLabel}>Where did you watch?</Text>
      <View style={styles.venueGrid}>
        {VENUES.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.venueChip, venue === v && styles.venueChipActive]}
            onPress={() => setVenue(v)}
          >
            <Text style={[styles.venueText, venue === v && styles.venueTextActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>When did you watch?</Text>
      <TextInput
        style={styles.dateInput}
        value={watchedAt}
        onChangeText={setWatchedAt}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textSecondary}
        keyboardType={Platform.OS === 'ios' ? 'default' : 'default'}
      />

      <Text style={styles.sectionLabel}>Notes (optional)</Text>
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="What did you think?"
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveText}>Save</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  movieName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ratingDot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ratingNum: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  ratingNumActive: {
    color: '#fff',
  },
  ratingLabel: {
    ...typography.h3,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  venueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  venueChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  venueChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  venueText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  venueTextActive: {
    color: '#fff',
  },
  dateInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  saveText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '700',
  },
});
