import React, { useCallback, useImperativeHandle, forwardRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
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
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_OUT_DURATION = 300;

interface SwipeDeckProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  onSwipeLeft?: (item: T) => void;
  onSwipeRight?: (item: T) => void;
  onEmpty?: () => React.ReactNode;
  cardIndex: number;
  onIndexChange: (index: number) => void;
}

export interface SwipeDeckRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

function SwipeDeckInner<T>(
  { data, renderCard, onSwipeLeft, onSwipeRight, onEmpty, cardIndex, onIndexChange }: SwipeDeckProps<T>,
  ref: React.Ref<SwipeDeckRef>,
) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handleSwipeComplete = useCallback(
    (direction: 'left' | 'right') => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const item = data[cardIndex];
      if (!item) return;

      if (direction === 'left') {
        onSwipeLeft?.(item);
      } else {
        onSwipeRight?.(item);
      }

      onIndexChange(cardIndex + 1);
    },
    [cardIndex, data, onSwipeLeft, onSwipeRight, onIndexChange],
  );

  const animateSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const target = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
      translateX.value = withTiming(target, { duration: SWIPE_OUT_DURATION }, () => {
        runOnJS(handleSwipeComplete)(direction);
        translateX.value = 0;
        translateY.value = 0;
      });
    },
    [handleSwipeComplete, translateX, translateY],
  );

  useImperativeHandle(ref, () => ({
    swipeLeft: () => animateSwipe('left'),
    swipeRight: () => animateSwipe('right'),
  }));

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: SWIPE_OUT_DURATION }, () => {
          runOnJS(handleSwipeComplete)('right');
          translateX.value = 0;
          translateY.value = 0;
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: SWIPE_OUT_DURATION }, () => {
          runOnJS(handleSwipeComplete)('left');
          translateX.value = 0;
          translateY.value = 0;
        });
      } else {
        translateX.value = withSpring(0, { damping: 20 });
        translateY.value = withSpring(0, { damping: 20 });
      }
    });

  const frontCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-15, 0, 15],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const backCardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH * 0.5],
      [0.92, 1],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH * 0.5],
      [0.6, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  if (cardIndex >= data.length) {
    return <View style={styles.container}>{onEmpty?.()}</View>;
  }

  return (
    <View style={styles.container}>
      {cardIndex + 1 < data.length && (
        <Animated.View style={[styles.card, styles.backCard, backCardStyle]}>
          {renderCard(data[cardIndex + 1], cardIndex + 1)}
        </Animated.View>
      )}

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, frontCardStyle]}>
          {renderCard(data[cardIndex], cardIndex)}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const SwipeDeck = forwardRef(SwipeDeckInner) as <T>(
  props: SwipeDeckProps<T> & { ref?: React.Ref<SwipeDeckRef> },
) => React.ReactElement;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
  },
  backCard: {
    zIndex: -1,
  },
});
