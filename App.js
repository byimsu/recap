import React from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from 'react-native';

import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import UserProgress from "./src/screens/UserProgress";
import Notes from "./src/screens/Notes";
import Flashcards from "./src/screens/Flashcards";
import BottomTabNavigator from "./src/navigation/BottomTabNavigator";
import ReviewScreen from "./src/screens/ReviewScreen";
import AddCardScreen from "./src/screens/AddCardScreen";
import SubjectNotesScreen from "./src/screens/SubjectNotesScreen";
import DeckDetailScreen from './src/screens/DeckDetailScreen';
import Settings from "./src/screens/Settings";
import Trash from "./src/screens/Trash";
import StudySchedule from "./src/screens/StudySchedule";
import Deadlines from "./src/screens/Deadlines";
import ProfileScreen from "./src/screens/ProfileScreen";

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#F17632" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={user ? "MainApp" : "Login"}
      >
        {user ? (
          <>
            <Stack.Screen name="MainApp" component={BottomTabNavigator} />
            <Stack.Screen name="UserProgress" component={UserProgress} />
            <Stack.Screen name="Notes" component={Notes} />
            <Stack.Screen name="SubjectNotes" component={SubjectNotesScreen} />
            <Stack.Screen name="Flashcards" component={Flashcards} />
            <Stack.Screen name="AddCard" component={AddCardScreen} />
            <Stack.Screen name="Review" component={ReviewScreen} />
            <Stack.Screen name="DeckDetail" component={DeckDetailScreen} options={{ title: 'Deck Cards' }} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="Trash" component={Trash} />
            <Stack.Screen name="StudySchedule" component={StudySchedule} />
            <Stack.Screen name="Deadlines" component={Deadlines} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}