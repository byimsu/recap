import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const THEME_KEY = '@app_theme_preference';
const AMOLED_KEY = '@app_amoled_preference';

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [userTheme, setUserTheme] = useState(null); // null means 'system'
  const [isAmoled, setIsAmoled] = useState(false);
  const [isLoaded, setIsLoading] = useState(false);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        const savedAmoled = await AsyncStorage.getItem(AMOLED_KEY);
        if (savedTheme) {
          setUserTheme(savedTheme === 'system' ? null : savedTheme);
        }
        if (savedAmoled) setIsAmoled(savedAmoled === 'true');
      } catch (e) {
        console.error("Error loading theme prefs:", e);
      } finally {
        setIsLoading(true);
      }
    };
    loadPrefs();
  }, []);

  const theme = userTheme || systemColorScheme || 'light';

  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setUserTheme(nextTheme);
    await AsyncStorage.setItem(THEME_KEY, nextTheme);
  };

  const setSystemTheme = async (useSystem) => {
    if (useSystem) {
      setUserTheme(null);
      await AsyncStorage.setItem(THEME_KEY, 'system');
    } else {
      setUserTheme(theme);
      await AsyncStorage.setItem(THEME_KEY, theme);
    }
  };

  const toggleAmoled = async () => {
    const nextAmoled = !isAmoled;
    setIsAmoled(nextAmoled);
    await AsyncStorage.setItem(AMOLED_KEY, nextAmoled.toString());
  };

  const colors = {
    bg: theme === 'light' ? '#FFFFFF' : (isAmoled ? '#000000' : '#121212'),
    card: theme === 'light' ? '#FAFAFA' : (isAmoled ? '#0A0A0A' : '#1E1E1E'),
    text: theme === 'light' ? '#0A0A0A' : '#FFFFFF',
    subtext: theme === 'light' ? '#6B6B6B' : '#A0A0A0',
    border: theme === 'light' ? '#E2E2E2' : (isAmoled ? '#1A1A1A' : '#2C2C2C'),
    button: theme === 'light' ? '#111111' : '#FFFFFF',
    buttonText: theme === 'light' ? '#FFFFFF' : '#111111',
    danger: '#D92D20',
    primary: theme === 'light' ? '#111111' : '#FFFFFF',
    chipBorder: theme === 'light' ? '#E2E2E2' : '#333333',
    success: '#12794F',
    customFallback: '#4B5563',
  };

  return (
    <ThemeContext.Provider value={{ theme, isAmoled, toggleTheme, setSystemTheme, userTheme, toggleAmoled, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};
