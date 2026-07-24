import React, { useEffect } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { SPRING_CONFIG, PILL_SIZE } from './navigationAnimations';

export default function BottomTab({
  route,
  isFocused,
  onPress,
  onLongPress,
  icon: IconComponent,
  colors,
}) {
  const { isHapticsEnabled } = useTheme();
  const scale = useSharedValue(1);
  const progress = useSharedValue(isFocused ? 1 : 0);

  const AnimatedIcon = React.useMemo(
    () => Animated.createAnimatedComponent(IconComponent),
    [IconComponent]
  );

  useEffect(() => {
    if (isFocused) {
      progress.value = withSpring(1, SPRING_CONFIG);
      scale.value = withSequence(
        withSpring(1.15, SPRING_CONFIG),
        withSpring(1.0, SPRING_CONFIG)
      );
    } else {
      progress.value = withSpring(0, SPRING_CONFIG);
      scale.value = withSpring(1.0, SPRING_CONFIG);
    }
  }, [isFocused]);

  const handlePress = () => {
    if (isHapticsEnabled !== false) {
      Haptics.selectionAsync();
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const inactiveColor = '#6B6B6B';
  const activeColor = colors.accent;

  const animatedProps = useAnimatedProps(() => {
    const color = interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, activeColor]
    );
    return { color };
  });

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      android_ripple={null}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={route.name}
    >
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <AnimatedIcon size={20} animatedProps={animatedProps} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  iconContainer: {
    width: PILL_SIZE,
    height: PILL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
