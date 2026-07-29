import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { Colors } from '@/constants/theme';
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

  const [renewals] = useState<UpcomingRenewal[]>([
    {
      id: '1',
      name: 'Netflix Premium',
      price: 19.99,
      date: 'In 4 Days',
      daysLeft: 4,
      isTrial: false,
      icon: 'tv',
      color: '#E50914',
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
      color: '#10A37F',
    },
    {
      id: '4',
      name: 'Gym Membership',
      price: 49.99,
      date: 'In 18 Days',
      daysLeft: 18,
      isTrial: false,
      icon: 'fitness',
      color: '#F59E0B',
    },
  ]);

  const [enable3DayAlert, setEnable3DayAlert] = useState(true);
  const [enableTrialAlert, setEnableTrialAlert] = useState(true);

  const colors = Colors.dark;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Renewal Calendar</Text>
            <Text style={styles.subtitle}>Upcoming Payments & Trial Expirations</Text>
          </View>
        </View>

        {/* Alert Controls Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Smart Notification Warnings</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchTitle}>3-Day Pre-Charge Alert</Text>
              <Text style={styles.switchSub}>Sends push notification before card gets debited</Text>
            </View>
            <Switch
              value={enable3DayAlert}
              onValueChange={setEnable3DayAlert}
              trackColor={{ false: '#334155', true: '#6366F1' }}
              thumbColor={enable3DayAlert ? '#FFF' : '#94A3B8'}
            />
          </View>

          <View style={[styles.switchRow, { marginTop: 12 }]}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchTitle}>Free Trial Auto-Cancel Alert</Text>
              <Text style={styles.switchSub}>Warns 24 hours before free trial converts to paid</Text>
            </View>
            <Switch
              value={enableTrialAlert}
              onValueChange={setEnableTrialAlert}
              trackColor={{ false: '#334155', true: '#6366F1' }}
              thumbColor={enableTrialAlert ? '#FFF' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Timeline of Renewals */}
        <View style={styles.listSection}>
          <Text style={styles.sectionHeader}>Upcoming Timeline</Text>

          {renewals.map((item) => (
            <View
              key={item.id}
              style={[styles.renewalCard, item.isTrial && styles.renewalCardTrial]}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>

              <View style={styles.infoGroup}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.isTrial && (
                    <View style={styles.trialPill}>
                      <Text style={styles.trialPillText}>TRIAL RISK</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.dateText}>{item.date}</Text>
              </View>

              <View style={styles.priceGroup}>
                <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Renewal Reminder Set',
                      `Push alert configured for ${item.name} in ${item.daysLeft - 1} days.`
                    )
                  }
                >
                  <Ionicons name="notifications-outline" size={18} color="#818CF8" />
                </TouchableOpacity>
              </View>
            </View>
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
    backgroundColor: '#090D16',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#131C2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 12,
  },
  switchTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  switchTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  switchSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  listSection: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  renewalCard: {
    backgroundColor: '#131C2E',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  renewalCardTrial: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  iconBox: {
    width: 40,
    height: 40,
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
    fontWeight: '700',
    color: '#F8FAFC',
  },
  trialPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trialPillText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  dateText: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 3,
  },
  priceGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
});
