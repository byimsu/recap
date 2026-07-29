import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import HomeScreen from '../screens/HomeScreen';
import UserProgress from '../screens/UserProgress';
import Notes from '../screens/Notes';
import ProfileScreen from '../screens/ProfileScreen';
import FloatingBottomBar from '../components/navigation/FloatingBottomBar';
import { useTheme } from '../context/ThemeContext';

const Tab = createMaterialTopTabNavigator();

export default function BottomTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <FloatingBottomBar {...props} />}
      screenOptions={{
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="NotesTab" component={Notes} />
      <Tab.Screen name="ProgressTab" component={UserProgress} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
