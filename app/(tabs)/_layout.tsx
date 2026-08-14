import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { hasCompletedOnboarding, isLoaded } = useSubscription();
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !hasCompletedOnboarding) {
      router.replace('/onboarding' as any);
    }
  }, [isLoaded, hasCompletedOnboarding]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDarkMode ? '#BEF264' : '#0F172A',
        tabBarInactiveTintColor: isDarkMode ? '#64748B' : '#94A3B8',
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('tab_progress'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.floatingCenterBtn}>
              <Ionicons name="scan-outline" size={24} color="#0F172A" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: t('tab_rewards'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'star' : 'star-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="monetization"
        options={{
          title: t('tab_menu'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="renewals"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: 70,
    paddingBottom: 12,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  floatingCenterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#BEF264',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
