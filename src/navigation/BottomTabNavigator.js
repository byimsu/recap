import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import UserProgress from '../screens/UserProgress';
import Notes from '../screens/Notes';
import ProfileScreen from '../screens/ProfileScreen';
import FloatingBottomBar from '../components/navigation/FloatingBottomBar';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingBottomBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="NotesTab" component={Notes} />
      <Tab.Screen name="ProgressTab" component={UserProgress} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
