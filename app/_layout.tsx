import React, { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { RevenueCatService } from '@/services/revenueCatService';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || (Constants as any).appOwnership === 'expo';

export const unstable_settings = {
  anchor: '(tabs)',
};

import mobileAds from 'react-native-google-mobile-ads';
import { NotificationPromptModal } from '@/components/NotificationPromptModal';

export default function RootLayout() {
  useEffect(() => {
    // Safely initialize native SDKs without crashing startup thread
    if (!isExpoGo) {
      try {
        RevenueCatService.configure();
      } catch (e) {
        console.warn('[RootLayout] RevenueCat init warning:', e);
      }
      try {
        mobileAds().initialize().then(() => {
          console.log('[RootLayout] Google Mobile Ads initialized.');
        }).catch((err) => {
          console.warn('[RootLayout] MobileAds init promise warning:', err);
        });
      } catch (e) {
        console.warn('[RootLayout] MobileAds init warning:', e);
      }
    }
  }, []);

  return (
    <SubscriptionProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F8FAFC' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Info' }} />
        </Stack>
        <NotificationPromptModal />
        <StatusBar style="dark" />
      </ThemeProvider>
    </SubscriptionProvider>
  );
}
