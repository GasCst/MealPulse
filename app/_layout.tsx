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

export default function RootLayout() {
  useEffect(() => {
    // Initialize RevenueCat In-App Purchases & Expo Push Notifications
    if (!isExpoGo) {
      RevenueCatService.configure();
      try {
        const { NotificationService } = require('@/services/notificationService');
        NotificationService.requestPermissions();
      } catch {
        // Expo Go bypass
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
        <StatusBar style="dark" />
      </ThemeProvider>
    </SubscriptionProvider>
  );
}
