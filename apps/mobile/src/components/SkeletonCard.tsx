import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

export default function SkeletonCard() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Animated.View style={[styles.textBlock, styles.title, animatedStyle]} />
      <Animated.View style={[styles.textBlock, styles.subtitle, animatedStyle]} />
      <Animated.View style={[styles.textBlock, styles.stats, animatedStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  textBlock: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  title: {
    height: 24,
    width: '70%',
    marginBottom: spacing.sm,
  },
  subtitle: {
    height: 16,
    width: '40%',
    marginBottom: spacing.sm,
  },
  stats: {
    height: 14,
    width: '55%',
  },
});
