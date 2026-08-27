import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { IOSInstallGuideModal } from '@/components/IOSInstallGuideModal';

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

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  return (
    <>
      <IOSInstallGuideModal />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: isDarkMode ? '#64748B' : '#94A3B8',
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: isDarkMode ? '#141822' : '#FFFFFF',
            borderTopColor: colors.cardBorder,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic(),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('tab_progress'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={22} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic(),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={[styles.floatingCenterBtn, { backgroundColor: colors.lime }]}>
              <Ionicons name="add" size={28} color="#0F172A" />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic(),
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
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={22} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic(),
        }}
      />
      <Tabs.Screen
        name="monetization"
        options={{
          title: t('tab_menu'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic(),
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
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 70,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: -2,
    letterSpacing: 0.2,
  },
  floatingCenterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
});
