import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  bg: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentGreen: string;
  inputBg: string;
  inputBorder: string;
  modalBg: string;
}

const lightColors: ThemeColors = {
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  accent: '#BEF264',
  accentGreen: '#84CC16',
  inputBg: '#F1F5F9',
  inputBorder: '#CBD5E1',
  modalBg: '#FFFFFF',
};

const darkColors: ThemeColors = {
  bg: '#090D16',
  cardBg: '#151C2C',
  cardBorder: '#1E293B',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  accent: '#BEF264',
  accentGreen: '#84CC16',
  inputBg: '#1E293B',
  inputBorder: '#334155',
  modalBg: '#151C2C',
};

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => Promise<void>;
  setDarkMode: (val: boolean) => Promise<void>;
  colors: ThemeColors;
}

const STORAGE_KEY = '@mealpulse_dark_mode';

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: async () => {},
  setDarkMode: async () => {},
  colors: lightColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setIsDarkMode(saved === 'true');
      }
    } catch (e) {
      console.warn('[ThemeContext] Failed to load theme preference:', e);
    }
  };

  const setDarkMode = async (val: boolean) => {
    setIsDarkMode(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
    } catch (e) {
      console.warn('[ThemeContext] Failed to save theme preference:', e);
    }
  };

  const toggleTheme = async () => {
    await setDarkMode(!isDarkMode);
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
        setDarkMode,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
