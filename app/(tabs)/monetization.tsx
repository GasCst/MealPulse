import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { AuthService } from '@/services/authService';
import { PaywallModal } from '@/components/PaywallModal';

export default function MonetizationScreen() {
  const { user, isPro, currentPlan, openPaywall } = useSubscription();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest Member';
  const userEmail = user?.email || 'Sign in to sync your cloud meal logs';

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your MealPulse account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AuthService.signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Account & Settings ⚙️</Text>
          <Text style={styles.subtitle}>Manage your profile & membership</Text>
        </View>

        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color="#84CC16" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
          <View style={[styles.statusBadge, isPro && styles.proBadge]}>
            <Ionicons name={isPro ? 'sparkles' : 'shield-outline'} size={12} color={isPro ? '#0F172A' : '#64748B'} />
            <Text style={[styles.statusBadgeText, isPro && styles.proBadgeText]}>
              {isPro ? 'PRO' : 'FREE'}
            </Text>
          </View>
        </View>

        {/* Subscription Status Card */}
        {!isPro ? (
          <TouchableOpacity style={styles.upgradeCard} onPress={() => openPaywall('settings_tab')} activeOpacity={0.85}>
            <View style={styles.upgradeHeader}>
              <Ionicons name="sparkles" size={22} color="#0F172A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeTitle}>Upgrade to MealPulse PRO</Text>
                <Text style={styles.upgradeSub}>100% Ad-Free, Unlimited AI Photo Scans & Item Counting Math.</Text>
              </View>
            </View>
            <View style={styles.upgradeBtn}>
              <Text style={styles.upgradeBtnText}>Unlock PRO Access</Text>
              <Ionicons name="arrow-forward" size={16} color="#0F172A" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeProCard}>
            <View style={styles.activeProHeader}>
              <Ionicons name="checkmark-circle" size={22} color="#84CC16" />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeProTitle}>MealPulse PRO Active</Text>
                <Text style={styles.activeProSub}>
                  {currentPlan ? `Active Plan: ${currentPlan.toUpperCase()}` : 'Unlimited Access Granted'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Preferences Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionHeader}>Preferences & Goals</Text>

          <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Daily Target', 'Your current target is set to 1,920 kcal/day.')}>
            <View style={styles.settingIconBox}>
              <Ionicons name="flame" size={18} color="#F97316" />
            </View>
            <Text style={styles.settingLabel}>Daily Calorie Target</Text>
            <Text style={styles.settingValue}>1,920 kcal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Hydration Target', 'Your daily water goal is 2,500 ml (10 glasses).')}>
            <View style={styles.settingIconBox}>
              <Ionicons name="water" size={18} color="#0EA5E9" />
            </View>
            <Text style={styles.settingLabel}>Daily Water Target</Text>
            <Text style={styles.settingValue}>2,500 ml</Text>
          </TouchableOpacity>

          {user && (
            <TouchableOpacity style={[styles.settingRow, { marginTop: 10 }]} onPress={handleSignOut}>
              <View style={[styles.settingIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7FEE7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BEF264',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  proBadge: {
    backgroundColor: '#BEF264',
  },
  proBadgeText: {
    color: '#0F172A',
  },
  upgradeCard: {
    backgroundColor: '#BEF264',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  upgradeSub: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    lineHeight: 16,
  },
  upgradeBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upgradeBtnText: {
    color: '#BEF264',
    fontSize: 13,
    fontWeight: '800',
  },
  activeProCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#BEF264',
    marginBottom: 24,
  },
  activeProHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeProTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeProSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  settingsSection: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  settingRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});
