import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';

export default function RootIndexScreen() {
  const { hasCompletedOnboarding, isLoaded } = useSubscription();

  if (isLoaded) {
    if (!hasCompletedOnboarding) {
      return <Redirect href="/onboarding" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#BEF264" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1410',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
