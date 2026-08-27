import React, { useEffect } from 'react';
import { DarkTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { RevenueCatService } from '@/services/revenueCatService';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || (Constants as any).appOwnership === 'expo';

export const unstable_settings = {
  anchor: 'index',
};

import { NotificationPromptModal } from '@/components/NotificationPromptModal';
import { Platform } from 'react-native';
import { AdMobService } from '@/services/adMobService';

export default function RootLayout() {
  useEffect(() => {
    // Safely initialize native SDKs without crashing startup thread or web bundler
    if (!isExpoGo && Platform.OS !== 'web') {
      try {
        RevenueCatService.configure();
      } catch (e) {
        console.warn('[RootLayout] RevenueCat init warning:', e);
      }
      try {
        AdMobService.initialize();
      } catch (e) {
        console.warn('[RootLayout] MobileAds init warning:', e);
      }
    }
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SubscriptionProvider>
          <NavThemeProvider value={DarkTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#F8FAFC' },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Info' }} />
            </Stack>
            <NotificationPromptModal />
            <StatusBar style="auto" />
          </NavThemeProvider>
        </SubscriptionProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
