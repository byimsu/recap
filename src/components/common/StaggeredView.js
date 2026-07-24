import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

export function StaggerView({
  delay = 0,
  distance = 10,
  duration = 240,
  style,
  children,
  ...props
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(duration).delay(delay)}
      style={style}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

export default StaggerView;
