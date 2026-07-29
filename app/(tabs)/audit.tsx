import React, { useState } from 'react';
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
import { Colors } from '@/constants/theme';
import { PaywallModal } from '@/components/PaywallModal';

interface RewardCard {
  id: string;
  title: string;
  points: number;
  unlocked: boolean;
  desc: string;
  icon: string;
}

export default function AuditRewardsScreen() {
  const { isPro, openPaywall } = useSubscription();

  const [rewards] = useState<RewardCard[]>([
    {
      id: '1',
      title: '7-Day Meal Logging Streak',
      points: 250,
      unlocked: true,
      desc: 'You logged all 3 meals for 7 consecutive days!',
      icon: 'trophy',
    },
    {
      id: '2',
      title: 'Protein Master Badge',
      points: 500,
      unlocked: true,
      desc: 'Hit your daily protein target 5 times this week.',
      icon: 'fitness',
    },
    {
      id: '3',
      title: 'PRO Hydration Champion',
      points: 1000,
      unlocked: false,
      desc: 'Unlocked with MealPulse PRO membership.',
      icon: 'water',
    },
  ]);

  const colors = Colors.light;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Rewards & Achievements</Text>
            <Text style={styles.subtitle}>Unlock Badges & Earn Nutrition Perks</Text>
          </View>

          <TouchableOpacity
            style={styles.proBadge}
            onPress={() => openPaywall('rewards_header')}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={14} color="#84CC16" />
            <Text style={styles.proBadgeText}>{isPro ? 'PRO UNLOCKED' : 'GET PRO'}</Text>
          </TouchableOpacity>
        </View>

        {/* Total Points Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <Text style={styles.heroCardLabel}>NUTRITION POINTS</Text>
            <Ionicons name="ribbon-outline" size={24} color="#84CC16" />
          </View>
          <View style={styles.pointsRow}>
            <Text style={styles.pointsVal}>750</Text>
            <Text style={styles.pointsUnit}>pts</Text>
          </View>
          <Text style={styles.heroSub}>Keep logging photo meals daily to level up!</Text>
        </View>

        {/* Rewards Checklist */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Your Achievements</Text>

          {rewards.map((item) => (
            <View key={item.id} style={styles.rewardCard}>
              <View style={[styles.rewardIconCircle, !item.unlocked && styles.iconLocked]}>
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={item.unlocked ? '#84CC16' : '#94A3B8'}
                />
              </View>

              <View style={styles.rewardInfoGroup}>
                <Text style={styles.rewardTitle}>{item.title}</Text>
                <Text style={styles.rewardDesc}>{item.desc}</Text>
              </View>

              <View style={styles.rewardPointsBadge}>
                <Text style={styles.rewardPointsText}>+{item.points} pts</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BEF264',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#BEF264',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#84CC16',
    letterSpacing: 0.5,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pointsVal: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0F172A',
  },
  pointsUnit: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '600',
  },
  heroSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
  },
  listSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  rewardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FEE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLocked: {
    backgroundColor: '#F1F5F9',
  },
  rewardInfoGroup: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  rewardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rewardPointsBadge: {
    backgroundColor: '#BEF264',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rewardPointsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
});
