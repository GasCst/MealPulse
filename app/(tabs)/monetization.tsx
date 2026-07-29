import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { Colors } from '@/constants/theme';
import { PaywallModal } from '@/components/PaywallModal';

export default function MonetizationScreen() {
  const { isPro, subscribe, cancelSubscription, openPaywall, setCompletedOnboarding, appMode, setAppMode } = useSubscription();

  const [targetMRR] = useState(2000);
  const [currentMRR] = useState(840);

  const mrrProgress = Math.min(1, currentMRR / targetMRR);

  const handleTogglePro = async (val: boolean) => {
    if (val) {
      await subscribe('monthly');
    } else {
      await cancelSubscription();
    }
  };

  const handleResetOnboarding = async () => {
    await setCompletedOnboarding(false);
    Alert.alert('Onboarding Reset', 'Restarting nutrition quiz funnel for testing.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Mode Switcher Banner */}
        <View style={styles.modeBanner}>
          <Text style={styles.modeBannerTitle}>APP ACTIVE VIEW MODE</Text>
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeTab, appMode === 'end_user' && styles.activeModeTab]}
              onPress={() => setAppMode('end_user')}
            >
              <Ionicons name="person" size={14} color={appMode === 'end_user' ? '#0F172A' : '#64748B'} />
              <Text style={[styles.modeTabText, appMode === 'end_user' && styles.activeModeTabText]}>
                End-User App Mode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, appMode === 'creator_admin' && styles.activeModeTab]}
              onPress={() => setAppMode('creator_admin')}
            >
              <Ionicons name="construct" size={14} color={appMode === 'creator_admin' ? '#0F172A' : '#64748B'} />
              <Text style={[styles.modeTabText, appMode === 'creator_admin' && styles.activeModeTabText]}>
                Admin / MRR Mode
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {appMode === 'creator_admin' ? 'Admin & MRR Engine' : 'Menu & Subscription Status'}
            </Text>
            <Text style={styles.subtitle}>
              {appMode === 'creator_admin'
                ? 'Subscription Revenue Target ($1k-$2k/month)'
                : 'Manage your MealPulse PRO membership & preferences'}
            </Text>
          </View>
        </View>

        {/* Target MRR Tracker Card (Visible in Admin Mode) */}
        {appMode === 'creator_admin' && (
          <View style={styles.mrrCard}>
            <View style={styles.mrrCardHeader}>
              <View style={styles.mrrBadge}>
                <Ionicons name="trending-up" size={14} color="#84CC16" />
                <Text style={styles.mrrBadgeText}>MONTHLY REVENUE TARGET</Text>
              </View>
              <Text style={styles.mrrGoalText}>Goal: ${targetMRR}/mo</Text>
            </View>

            <View style={styles.mrrAmountRow}>
              <Text style={styles.mrrAmountVal}>${currentMRR}</Text>
              <Text style={styles.mrrUnit}>/ month current MRR</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(mrrProgress * 100)}%` }]} />
            </View>
            <Text style={styles.mrrProgressPercent}>
              {Math.round(mrrProgress * 100)}% of $2,000/mo goal achieved (56 PRO subscribers)
            </Text>
          </View>
        )}

        {/* Developer PRO Switch */}
        <View style={styles.devCard}>
          <View style={styles.devRow}>
            <View style={styles.devLeft}>
              <Ionicons name="flash-outline" size={20} color="#84CC16" />
              <View>
                <Text style={styles.devTitle}>MealPulse PRO Status</Text>
                <Text style={styles.devSub}>Toggle PRO status for feature testing</Text>
              </View>
            </View>
            <Switch
              value={isPro}
              onValueChange={handleTogglePro}
              trackColor={{ false: '#E2E8F0', true: '#BEF264' }}
              thumbColor={isPro ? '#84CC16' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Menu Actions List */}
        <View style={styles.menuListSection}>
          <Text style={styles.sectionTitle}>App Menu & Testing</Text>

          <TouchableOpacity style={styles.menuCard} onPress={() => openPaywall('menu_paywall')}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="sparkles" size={18} color="#84CC16" />
            </View>
            <Text style={styles.menuText}>Preview PRO Paywall Modal</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={handleResetOnboarding}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="refresh" size={18} color="#0EA5E9" />
            </View>
            <Text style={styles.menuText}>Restart Onboarding Nutrition Funnel</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PaywallModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  modeBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  modeBannerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeModeTab: {
    backgroundColor: '#BEF264',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activeModeTabText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  mrrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#BEF264',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  mrrCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mrrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FEE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  mrrBadgeText: {
    color: '#84CC16',
    fontSize: 10,
    fontWeight: '800',
  },
  mrrGoalText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  mrrAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  mrrAmountVal: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
  },
  mrrUnit: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#84CC16',
    borderRadius: 4,
  },
  mrrProgressPercent: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  devCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  devRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  devLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  devTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  devSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  menuListSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
});
