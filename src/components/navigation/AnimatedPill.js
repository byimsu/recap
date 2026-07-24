import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { PILL_SIZE, TAB_BAR_HEIGHT } from './navigationAnimations';

export default function AnimatedPill({ translateX, backgroundColor }) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.pill,
        { backgroundColor },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: (TAB_BAR_HEIGHT - PILL_SIZE) / 2,
    left: 0,
    width: PILL_SIZE,
    height: PILL_SIZE,
    borderRadius: PILL_SIZE / 2,
  },
});
