import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const THEME_KEY = '@app_theme_preference';
const AMOLED_KEY = '@app_amoled_preference';
const HAPTICS_KEY = '@app_haptics_preference';
const ACCENT = '#F97316';

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [userTheme, setUserTheme] = useState(null); // null means 'system'
  const [isAmoled, setIsAmoled] = useState(false);
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(true);
  const [isLoaded, setIsLoading] = useState(false);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        const savedAmoled = await AsyncStorage.getItem(AMOLED_KEY);
        const savedHaptics = await AsyncStorage.getItem(HAPTICS_KEY);
        if (savedTheme) {
          setUserTheme(savedTheme === 'system' ? null : savedTheme);
        }
        if (savedAmoled) setIsAmoled(savedAmoled === 'true');
        if (savedHaptics !== null) setIsHapticsEnabled(savedHaptics === 'true');
      } catch (e) {
        console.error("Error loading theme prefs:", e);
      } finally {
        setIsLoading(true);
      }
    };
    loadPrefs();
  }, []);

  const theme = userTheme || systemColorScheme || 'light';

  const toggleTheme = useCallback(async () => {
    const current = userTheme || systemColorScheme || 'light';
    const nextTheme = current === 'light' ? 'dark' : 'light';
    setUserTheme(nextTheme);
    AsyncStorage.setItem(THEME_KEY, nextTheme).catch(console.error);
  }, [userTheme, systemColorScheme]);

  const setSystemTheme = useCallback(async (useSystem) => {
    if (useSystem) {
      setUserTheme(null);
      await AsyncStorage.setItem(THEME_KEY, 'system').catch(console.error);
    } else {
      const currentTheme = theme;
      setUserTheme(currentTheme);
      await AsyncStorage.setItem(THEME_KEY, currentTheme).catch(console.error);
    }
  }, [theme]);

  const toggleAmoled = useCallback(async () => {
    const nextAmoled = !isAmoled;
    setIsAmoled(nextAmoled);
    AsyncStorage.setItem(AMOLED_KEY, nextAmoled.toString()).catch(console.error);
  }, [isAmoled]);

  const toggleHaptics = useCallback(async () => {
    const nextHaptics = !isHapticsEnabled;
    setIsHapticsEnabled(nextHaptics);
    AsyncStorage.setItem(HAPTICS_KEY, nextHaptics.toString()).catch(console.error);
  }, [isHapticsEnabled]);

  const colors = useMemo(() => ({
    // Backgrounds & Surfaces
    bg:          theme === 'light' ? '#F5F4F0' : (isAmoled ? '#000000' : '#0D0D0D'),
    card:        theme === 'light' ? '#FFFFFF' : (isAmoled ? '#0A0A0A' : '#161616'),
    statCard:    theme === 'light' ? '#F7F5F1' : (isAmoled ? '#121212' : '#1C1C1C'),
    actionChipSurface: theme === 'light' ? '#F8F7F3' : (isAmoled ? '#121212' : '#1C1C1C'),
    emptyStateSurface: theme === 'light' ? '#FAF9F6' : (isAmoled ? '#0E0E0E' : '#181818'),
    surface:     theme === 'light' ? '#F7F5F1' : (isAmoled ? '#121212' : '#1F1F1F'),
    surfaceSubtle: theme === 'light' ? '#FAF9F6' : (isAmoled ? '#0E0E0E' : '#181818'),

    // Text
    text:        theme === 'light' ? '#1A1A1A' : '#F8F8F8',
    subtext:     theme === 'light' ? '#6E6B66' : '#888888',
    mutedText:   theme === 'light' ? '#9A958D' : '#666666',

    // Borders
    border:      theme === 'light' ? '#ECE8E2' : (isAmoled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.09)'),

    // Accent (constant across themes — single brand color)
    accent:      ACCENT,
    accentSoft:  theme === 'light' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(249, 115, 22, 0.20)',

    // Primary action (buttons, active states)
    button:      ACCENT,
    buttonText:  '#FFFFFF',
    primary:     ACCENT,

    // Semantic
    danger:      '#D92D20',
    success:     '#12794F',
    chipBorder:  theme === 'light' ? '#ECE8E2' : (isAmoled ? '#1A1A1A' : '#252525'),
    customFallback: '#4B5563',
  }), [theme, isAmoled]);

  const contextValue = useMemo(() => ({
    theme,
    isAmoled,
    isHapticsEnabled,
    toggleTheme,
    setSystemTheme,
    userTheme,
    toggleAmoled,
    toggleHaptics,
    colors,
  }), [theme, isAmoled, isHapticsEnabled, toggleTheme, setSystemTheme, userTheme, toggleAmoled, toggleHaptics, colors]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

