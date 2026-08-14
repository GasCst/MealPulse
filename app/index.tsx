import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';

export default function RootIndexScreen() {
  const { hasCompletedOnboarding, isLoaded } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!hasCompletedOnboarding) {
      router.replace('/onboarding' as any);
    } else {
      router.replace('/(tabs)' as any);
    }
  }, [isLoaded, hasCompletedOnboarding]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#BEF264" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
