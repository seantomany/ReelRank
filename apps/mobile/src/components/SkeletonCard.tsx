import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, borderRadius } from '../theme';
import { getCardDimensions } from './MovieCard';

export function SkeletonCard() {
  const { width, height } = useWindowDimensions();
  const { cardWidth, cardHeight } = getCardDimensions(width, height);
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
      <Animated.View style={[styles.card, { width: cardWidth, height: cardHeight }, animatedStyle]}>
        <View style={styles.poster} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  poster: {
    flex: 1,
    backgroundColor: colors.border,
  },
});
