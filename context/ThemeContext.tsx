import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  bg: string;
  cardBg: string;
  cardBorder: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentGreen: string;
  coral: string;
  coralLight: string;
  green: string;
  greenLight: string;
  amber: string;
  amberLight: string;
  sky: string;
  skyLight: string;
  emerald: string;
  emeraldLight: string;
  lime: string;
  limeGlow: string;
  inputBg: string;
  inputBorder: string;
  modalBg: string;
  breakfastTint: string;
  snackTint: string;
  lunchTint: string;
  dinnerTint: string;
}

const lightColors: ThemeColors = {
  bg: '#F4F8F4',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(0, 0, 0, 0.06)',
  border: 'rgba(0, 0, 0, 0.06)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accent: '#84CC16',
  accentGreen: '#10B981',
  coral: '#FF6B4A',
  coralLight: '#FFF0ED',
  green: '#10B981',
  greenLight: '#EFF8F2',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  sky: '#0284C7',
  skyLight: '#E0F2FE',
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  lime: '#84CC16',
  limeGlow: 'rgba(132, 204, 22, 0.2)',
  inputBg: '#F1F5F9',
  inputBorder: '#E2E8F0',
  modalBg: '#FFFFFF',
  breakfastTint: '#FFF0ED',
  snackTint: '#EFF8F2',
  lunchTint: '#F4FBF1',
  dinnerTint: '#FFF9E6',
};

const darkColors: ThemeColors = {
  bg: '#0F131C',
  cardBg: '#181C26',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FEFFF1',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#BEF264',
  accentGreen: '#10B981',
  coral: '#FF6B4A',
  coralLight: 'rgba(255, 107, 74, 0.15)',
  green: '#10B981',
  greenLight: 'rgba(16, 185, 129, 0.15)',
  amber: '#FFA726',
  amberLight: 'rgba(255, 167, 38, 0.15)',
  sky: '#38BDF8',
  skyLight: 'rgba(56, 189, 248, 0.15)',
  emerald: '#10B981',
  emeraldLight: 'rgba(16, 185, 129, 0.15)',
  lime: '#BEF264',
  limeGlow: 'rgba(190, 242, 100, 0.25)',
  inputBg: '#1C2230',
  inputBorder: '#283144',
  modalBg: '#141822',
  breakfastTint: '#221918',
  snackTint: '#14221C',
  lunchTint: '#18241C',
  dinnerTint: '#242116',
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
