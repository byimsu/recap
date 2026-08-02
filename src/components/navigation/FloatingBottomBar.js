import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { Home, BarChart2, BookOpen, User, NotebookPen } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import AnimatedPill from './AnimatedPill';
import BottomTab from './BottomTab';
import { SPRING_CONFIG, TAB_BAR_WIDTH, TAB_BAR_HEIGHT, PILL_SIZE } from './navigationAnimations';

const ICON_MAP = {
  HomeTab: Home,
  NotesTab: BookOpen,
  TextNotesTab: NotebookPen,
  ProgressTab: BarChart2,
  ProfileTab: User,
};

export default function FloatingBottomBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const [barWidth, setBarWidth] = useState(TAB_BAR_WIDTH);

  const numTabs = state.routes.length;
  const tabWidth = barWidth / numTabs;
  const targetX = state.index * tabWidth + (tabWidth - PILL_SIZE) / 2;
  const translateX = useSharedValue(targetX);

  useEffect(() => {
    translateX.value = withSpring(targetX, SPRING_CONFIG);
  }, [state.index, barWidth, targetX]);

  const handleLayout = (e) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== barWidth) {
      setBarWidth(width);
    }
  };

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View
        onLayout={handleLayout}
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <AnimatedPill
          translateX={translateX}
          backgroundColor={colors.accentSoft || 'rgba(249, 115, 22, 0.12)'}
        />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const IconComponent = ICON_MAP[route.name] || Home;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <BottomTab
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              icon={IconComponent}
              colors={colors}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    position: 'relative',
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: 32,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'hidden',
  },
});
