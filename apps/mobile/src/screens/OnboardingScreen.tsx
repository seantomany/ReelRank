import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'reelrank_onboarded';

const slides = [
  {
    icon: 'film-outline' as const,
    title: 'Discover Movies',
    description: 'Swipe through trending and genre-based movies to build your personal taste profile.',
  },
  {
    icon: 'git-compare-outline' as const,
    title: 'Refine Rankings',
    description: "Compare movies head-to-head to fine-tune your rankings. Your scores get smarter with every pick.",
  },
  {
    icon: 'people-outline' as const,
    title: 'Group Watch',
    description: "Can't decide what to watch with friends? Create a room, everyone votes, and get the perfect pick.",
  },
  {
    icon: 'chatbubble-ellipses-outline' as const,
    title: 'AI Recommendations',
    description: 'Chat with our AI that knows your taste. Get personalized picks based on your mood and history.',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      handleDone();
    }
  };

  const handleDone = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleDone}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.nextButton}
          labelStyle={styles.nextLabel}
        >
          {activeIndex === slides.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </View>
  );
}

export async function hasSeenOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceVariant,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  nextLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
