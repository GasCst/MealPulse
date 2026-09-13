import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { IOSInstallGuideModal } from '@/components/IOSInstallGuideModal';
import { RadialFabExpander } from '@/components/navbar/RadialFabExpander';
import { AnimatedTabItem } from '@/components/navbar/AnimatedTabItem';
import { QuickLogModal } from '@/components/QuickLogModal';

export default function TabLayout() {
  const { hasCompletedOnboarding, isLoaded, updateWaterIntake } = useSubscription();
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);

  useEffect(() => {
    if (isLoaded && !hasCompletedOnboarding) {
      router.replace('/onboarding' as any);
    }
  }, [isLoaded, hasCompletedOnboarding]);

  // 1. Azione Cibo -> Apre il selettore pasti rapido
  const handleAddFood = () => {
    setShowQuickLogModal(true);
  };

  // 2. Azione Acqua -> +250 ml immediati con haptic e sincronizzazione
  const handleAddWater = async () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    await updateWaterIntake(250);
  };

  // 3. Azione Scansione Rapida IA -> Reindirizza alla fotocamera/scanner su Home
  const handleQuickScan = () => {
    router.push({
      pathname: '/(tabs)',
      params: { triggerAiScan: Date.now().toString() },
    } as any);
  };

  return (
    <>
      <IOSInstallGuideModal />

      {/* Selettore pasti ad accesso rapido per Colazione, Pranzo, Cena, Spuntino */}
      <QuickLogModal
        visible={showQuickLogModal}
        onClose={() => setShowQuickLogModal(false)}
        onSelectMeal={(mealSlot) => {
          setShowQuickLogModal(false);
          router.push({
            pathname: '/(tabs)',
            params: { openSlot: mealSlot },
          } as any);
        }}
        onLogWater={async (amountMl) => {
          await updateWaterIntake(amountMl);
          setShowQuickLogModal(false);
        }}
      />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.hiddenTabBar,
        }}
        tabBar={(props) => {
          const activeColor = colors.lime;
          const inactiveColor = isDarkMode ? '#64748B' : '#94A3B8';
          const activeRouteName = props.state.routes[props.state.index]?.name;

          return (
            <View
              style={[
                styles.customTabBarContainer,
                {
                  backgroundColor: isDarkMode ? '#141822' : '#FFFFFF',
                  borderTopColor: colors.cardBorder,
                  paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 10),
                  height: (Platform.OS === 'ios' ? 56 : 58) + Math.max(insets.bottom, 10),
                },
              ]}
            >
              {/* Tab 1: Home (con effetto ingrandimento animato) */}
              <AnimatedTabItem
                label={t('tab_home')}
                focusedIcon="grid"
                outlineIcon="grid-outline"
                focused={activeRouteName === 'index'}
                onPress={() => props.navigation.navigate('index')}
                activeColor={activeColor}
                inactiveColor={inactiveColor}
              />

              {/* Tab 2: Progresso (con effetto ingrandimento animato) */}
              <AnimatedTabItem
                label={t('tab_progress')}
                focusedIcon="stats-chart"
                outlineIcon="stats-chart-outline"
                focused={activeRouteName === 'analytics'}
                onPress={() => props.navigation.navigate('analytics')}
                activeColor={activeColor}
                inactiveColor={inactiveColor}
              />

              {/* Pulsante Centrale: Espansore Radiale Dinamico "+" */}
              <RadialFabExpander
                onAddFood={handleAddFood}
                onAddWater={handleAddWater}
                onQuickScan={handleQuickScan}
                onOpenDiario={() => props.navigation.navigate('log')}
                onLongPress={() => props.navigation.navigate('log')}
                colors={{
                  lime: colors.lime,
                  coral: colors.coral || '#FF6B4A',
                  sky: colors.sky || '#0284C7',
                  purple: '#8B5CF6',
                }}
              />

              {/* Tab 3: Premi (con effetto ingrandimento animato) */}
              <AnimatedTabItem
                label={t('tab_rewards')}
                focusedIcon="trophy"
                outlineIcon="trophy-outline"
                focused={activeRouteName === 'audit'}
                onPress={() => props.navigation.navigate('audit')}
                activeColor={activeColor}
                inactiveColor={inactiveColor}
              />

              {/* Tab 4: Menu PRO (con effetto ingrandimento animato) */}
              <AnimatedTabItem
                label={t('tab_menu')}
                focusedIcon="person"
                outlineIcon="person-outline"
                focused={activeRouteName === 'monetization'}
                onPress={() => props.navigation.navigate('monetization')}
                activeColor={activeColor}
                inactiveColor={inactiveColor}
              />
            </View>
          );
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tab_home'),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: t('tab_progress'),
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: '',
            href: null,
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
          }}
        />
        <Tabs.Screen
          name="monetization"
          options={{
            title: t('tab_menu'),
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
  hiddenTabBar: {
    display: 'none',
  },
  customTabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 6,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
});
