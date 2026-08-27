import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTheme } from '@/context/ThemeContext';
import { PaywallModal } from '@/components/PaywallModal';

interface UpcomingRenewal {
  id: string;
  name: string;
  price: number;
  date: string;
  daysLeft: number;
  isTrial: boolean;
  icon: string;
  color: string;
}

export default function RenewalsScreen() {
  const { isPro, openPaywall } = useSubscription();
  const { colors, isDarkMode } = useTheme();

  const [renewals] = useState<UpcomingRenewal[]>([
    {
      id: '1',
      name: 'Netflix Premium',
      price: 19.99,
      date: 'In 4 Days',
      daysLeft: 4,
      isTrial: false,
      icon: 'tv',
      color: '#EF4444',
    },
    {
      id: '2',
      name: 'Adobe Cloud Free Trial',
      price: 54.99,
      date: 'In 3 Days (TRIAL CONVERSION)',
      daysLeft: 3,
      isTrial: true,
      icon: 'color-palette',
      color: '#F59E0B',
    },
    {
      id: '3',
      name: 'ChatGPT Plus',
      price: 20.00,
      date: 'In 11 Days',
      daysLeft: 11,
      isTrial: false,
      icon: 'sparkles',
      color: '#10B981',
    },
    {
      id: '4',
      name: 'Gym Membership',
      price: 49.99,
      date: 'In 18 Days',
      daysLeft: 18,
      isTrial: false,
      icon: 'fitness',
      color: '#38BDF8',
    },
  ]);

  const [enable3DayAlert, setEnable3DayAlert] = useState(true);
  const [enableTrialAlert, setEnableTrialAlert] = useState(true);

  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Renewal Calendar</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Upcoming Payments & Trial Expirations</Text>
          </View>
        </View>

        {/* Alert Controls Card */}
        <Animated.View
          entering={FadeInUp.duration(500)}
          style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
        >
          <Text style={[styles.cardHeader, { color: colors.textPrimary }]}>Smart Notification Warnings</Text>

          <View style={[styles.switchRow, { backgroundColor: colors.inputBg }]}>
            <View style={styles.switchTextGroup}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>3-Day Pre-Charge Alert</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Sends push notification before card gets debited</Text>
            </View>
            <Switch
              value={enable3DayAlert}
              onValueChange={(v) => {
                triggerHaptic('light');
                setEnable3DayAlert(v);
              }}
              trackColor={{ false: isDarkMode ? '#283144' : '#CBD5E1', true: colors.lime }}
              thumbColor={enable3DayAlert ? '#0F172A' : '#94A3B8'}
            />
          </View>

          <View style={[styles.switchRow, { backgroundColor: colors.inputBg, marginTop: 10 }]}>
            <View style={styles.switchTextGroup}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Free Trial Auto-Cancel Alert</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Warns 24 hours before free trial converts to paid</Text>
            </View>
            <Switch
              value={enableTrialAlert}
              onValueChange={(v) => {
                triggerHaptic('light');
                setEnableTrialAlert(v);
              }}
              trackColor={{ false: isDarkMode ? '#283144' : '#CBD5E1', true: colors.lime }}
              thumbColor={enableTrialAlert ? '#0F172A' : '#94A3B8'}
            />
          </View>
        </Animated.View>

        {/* Timeline of Renewals */}
        <View style={styles.listSection}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Upcoming Timeline</Text>

          {renewals.map((item, idx) => (
            <Animated.View
              key={item.id}
              entering={FadeInUp.delay(100 + idx * 60).duration(400)}
            >
              <View
                style={[
                  styles.renewalCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                  item.isTrial && {
                    borderColor: 'rgba(245, 158, 11, 0.4)',
                    backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
                  },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>

                <View style={styles.infoGroup}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>
                    {item.isTrial && (
                      <View style={styles.trialPill}>
                        <Text style={styles.trialPillText}>TRIAL RISK</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>{item.date}</Text>
                </View>

                <View style={styles.priceGroup}>
                  <Text style={[styles.priceText, { color: colors.textPrimary }]}>${item.price.toFixed(2)}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic('medium');
                      Alert.alert(
                        'Renewal Reminder Set',
                        `Push alert configured for ${item.name} in ${item.daysLeft - 1} days.`
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="notifications-outline" size={18} color={colors.lime} />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <PaywallModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
  },
  switchTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  switchTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  listSection: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  renewalCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoGroup: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  trialPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trialPillText: {
    color: '#0F172A',
    fontSize: 9,
    fontWeight: '900',
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  priceGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
