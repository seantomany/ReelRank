import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { MainTabScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>ReelRank</Text>
        <Text style={styles.subtitle}>What are we watching?</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SoloSwipe')}
        >
          <LinearGradient
            colors={['#E94560', '#C73659']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
            <Text style={styles.cardTitle}>Solo Mode</Text>
            <Text style={styles.cardDesc}>
              Swipe through movies, build your personal rankings, and track your watchlist
            </Text>
            <View style={styles.cardFeatures}>
              <Feature icon="swap-horizontal" label="Swipe Deck" />
              <Feature icon="trophy" label="This or That" />
              <Feature icon="list" label="My Rankings" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CreateRoom')}
        >
          <LinearGradient
            colors={['#7B2FF7', '#5B1FD7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="people" size={32} color="#fff" />
            </View>
            <Text style={styles.cardTitle}>Group Mode</Text>
            <Text style={styles.cardDesc}>
              Create a room, invite friends, and decide what to watch together in real-time
            </Text>
            <View style={styles.cardFeatures}>
              <Feature icon="qr-code" label="Join Code" />
              <Feature icon="hand-left" label="Group Vote" />
              <Feature icon="podium" label="Results" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('JoinRoom')}
        >
          <Ionicons name="enter-outline" size={20} color={colors.primary} />
          <Text style={styles.joinText}>Join a Room with Code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon as any} size={14} color="rgba(255,255,255,0.8)" />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.hero,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cards: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h1,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  cardFeatures: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  joinText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
