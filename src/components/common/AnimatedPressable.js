import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

const PRESS_SPRING = {
  stiffness: 250,
  damping: 20,
  mass: 0.8,
};

const PRESS_CONFIGS = {
  button: { targetScale: 0.96, translateY: 0, haptic: 'light' },
  import: { targetScale: 0.95, translateY: 0, haptic: 'light' },
  card: { targetScale: 0.985, translateY: 1, haptic: 'selection' },
  row: { targetScale: 0.99, translateY: 0, haptic: 'selection' },
};

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  type = 'button',
  haptic,
  disabled,
  ...props
}) {
  const { isHapticsEnabled } = useTheme();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const config = PRESS_CONFIGS[type] || PRESS_CONFIGS.button;
  const hapticType = haptic || config.haptic;

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(config.targetScale, PRESS_SPRING);
    if (config.translateY) {
      translateY.value = withSpring(config.translateY, PRESS_SPRING);
    }
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, PRESS_SPRING);
    if (config.translateY) {
      translateY.value = withSpring(0, PRESS_SPRING);
    }
  };

  const handlePress = (e) => {
    if (disabled) return;
    if (isHapticsEnabled !== false) {
      if (hapticType === 'light') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (hapticType === 'medium') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (hapticType === 'selection') {
        Haptics.selectionAsync();
      }
    }
    if (onPress) onPress(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <AnimatedPressableBase
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </AnimatedPressableBase>
  );
}

export default AnimatedPressable;
