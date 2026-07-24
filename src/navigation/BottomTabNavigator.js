import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { Home, BarChart2, BookOpen, User } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import UserProgress from '../screens/UserProgress';
import Notes from '../screens/Notes';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const TAB_BAR_WIDTH = 260;

export default function BottomTabNavigator() {
  const { colors } = useTheme();

  const renderIcon = (Icon, color, focused) => (
    <View
      style={[
        styles.iconWrapper,
        focused && { backgroundColor: colors.accentSoft || 'rgba(241, 118, 50, 0.12)' }
      ]}
    >
      <Icon size={20} color={focused ? colors.accent : colors.subtext} />
    </View>
  );

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <View style={styles.tabBarContainer} pointerEvents="box-none">
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        safeAreaInsets: { bottom: 0, top: 0, left: 0, right: 0 },
        tabBarButton: (props) => (
          <Pressable
            {...props}
            android_ripple={null}
            style={({ pressed }) => [
              props.style,
              styles.tabBarButton,
              { opacity: pressed ? 0.8 : 1 }
            ]}
          />
        ),
        tabBarStyle: [
          styles.tabBar,
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border,
          }
        ],
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, focused }) => renderIcon(Home, color, focused)
        }}
      />
      <Tab.Screen 
        name="NotesTab" 
        component={Notes} 
        options={{
          tabBarIcon: ({ color, focused }) => renderIcon(BookOpen, color, focused)
        }}
      />
      <Tab.Screen 
        name="ProgressTab" 
        component={UserProgress} 
        options={{
          tabBarIcon: ({ color, focused }) => renderIcon(BarChart2, color, focused)
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ color, focused }) => renderIcon(User, color, focused)
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    position: 'relative',
    bottom: 0,
    left: 0,
    right: 0,
    width: TAB_BAR_WIDTH,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    paddingBottom: 0,
    paddingTop: 0,
    paddingHorizontal: 6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabBarItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 64,
    padding: 0,
    margin: 0,
  },
  tabBarButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    padding: 0,
    margin: 0,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
