import React, { useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { MovieCard } from './MovieCard';
import { colors, borderRadius } from '../theme';
import type { Movie, SwipeDirection } from '@reelrank/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeDeckProps {
  movies: Movie[];
  currentIndex: number;
  onSwipe: (movie: Movie, direction: SwipeDirection) => void;
  onCardPress?: (movie: Movie) => void;
}

export interface SwipeDeckRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

export const SwipeDeck = forwardRef<SwipeDeckRef, SwipeDeckProps>(
  ({ movies, currentIndex, onSwipe, onCardPress }, ref) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const triggerSwipe = useCallback(
      (direction: SwipeDirection) => {
        const movie = movies[currentIndex];
        if (!movie) return;
        const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
        translateX.value = withTiming(targetX, { duration: 300 }, () => {
          runOnJS(onSwipe)(movie, direction);
          translateX.value = 0;
          translateY.value = 0;
        });
      },
      [movies, currentIndex, onSwipe, translateX, translateY]
    );

    useImperativeHandle(ref, () => ({
      swipeLeft: () => triggerSwipe('left'),
      swipeRight: () => triggerSwipe('right'),
    }));

    const gesture = Gesture.Pan()
      .onUpdate((event) => {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      })
      .onEnd((event) => {
        if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
          const direction: SwipeDirection = event.translationX > 0 ? 'right' : 'left';
          const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
          translateX.value = withTiming(targetX, { duration: 200 }, () => {
            const movie = movies[currentIndex];
            if (movie) {
              runOnJS(onSwipe)(movie, direction);
            }
            translateX.value = 0;
            translateY.value = 0;
          });
        } else {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
        }
      });

    const cardStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        {
          rotate: `${interpolate(
            translateX.value,
            [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
            [-15, 0, 15],
            Extrapolation.CLAMP
          )}deg`,
        },
      ],
    }));

    const wantOverlayStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD],
        [0, 0.85],
        Extrapolation.CLAMP
      ),
    }));

    const passOverlayStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [-SWIPE_THRESHOLD, 0],
        [0.85, 0],
        Extrapolation.CLAMP
      ),
    }));

    const currentMovie = movies[currentIndex];
    if (!currentMovie) return null;

    return (
      <View style={styles.container}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.cardWrapper, cardStyle]}>
            <MovieCard movie={currentMovie} onPress={() => onCardPress?.(currentMovie)} />
            <Animated.View style={[styles.overlay, styles.wantOverlay, wantOverlayStyle]}>
              <Text style={[styles.overlayText, { color: colors.want }]}>WANT</Text>
            </Animated.View>
            <Animated.View style={[styles.overlay, styles.passOverlay, passOverlayStyle]}>
              <Text style={[styles.overlayText, { color: colors.pass }]}>PASS</Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

SwipeDeck.displayName = 'SwipeDeck';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  wantOverlay: {
    borderWidth: 3,
    borderColor: colors.want,
  },
  passOverlay: {
    borderWidth: 3,
    borderColor: colors.pass,
  },
  overlayText: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 4,
    transform: [{ rotate: '-15deg' }],
  },
});
