import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, borderRadius } from '../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export function SkeletonCard() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.poster} />
        <View style={styles.content}>
          <View style={styles.titleBar} />
          <View style={styles.subtitleBar} />
          <View style={styles.ratingBar} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  poster: {
    flex: 1,
    backgroundColor: colors.border,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  titleBar: {
    height: 20,
    width: '70%',
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
  },
  subtitleBar: {
    height: 14,
    width: '40%',
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
  },
  ratingBar: {
    height: 14,
    width: '25%',
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
  },
});
