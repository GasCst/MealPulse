import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { SupabaseService, CloudMealLog } from '@/services/supabaseService';
import { PaywallModal } from '@/components/PaywallModal';

export default function AuditRewardsScreen() {
  const { user, isPro, openPaywall } = useSubscription();
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [mealLogs, setMealLogs] = useState<CloudMealLog[]>([]);

  const targetCalorieGoal = 1920;

  useEffect(() => {
    loadUserRewards();
  }, [user]);

  const loadUserRewards = async () => {
    setLoading(true);
    const data = await SupabaseService.fetchMealLogsHistory(user?.id);
    setMealLogs(data);
    setLoading(false);
  };

  // Group meals by date (YYYY-MM-DD)
  const daysLoggedMap: Record<string, number> = {};
  mealLogs.forEach((m) => {
    const d = m.logged_at ? m.logged_at.split('T')[0] : 'Today';
    daysLoggedMap[d] = (daysLoggedMap[d] || 0) + Number(m.calories || 0);
  });

  const uniqueDaysCount = Object.keys(daysLoggedMap).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCalories = daysLoggedMap[todayStr] || 0;

  // Calorie Goal Compliance Check
  const isGoalMetToday = todayCalories > 0 && todayCalories <= targetCalorieGoal;
  const isOverGoal = todayCalories > targetCalorieGoal;

  // Score Calculation (0 to 100)
  let dailyScore = 100;
  if (todayCalories === 0) {
    dailyScore = 0;
  } else if (todayCalories > targetCalorieGoal) {
    dailyScore = Math.max(50, 100 - Math.round(((todayCalories - targetCalorieGoal) / targetCalorieGoal) * 100));
  } else {
    dailyScore = Math.round((todayCalories / targetCalorieGoal) * 100);
  }

  // Calculate Streak & Points
  const streakDays = Math.max(uniqueDaysCount, todayCalories > 0 ? 1 : 0);
  const totalPoints = (streakDays * 100) + (isGoalMetToday ? 150 : 50) + (isPro ? 500 : 0);

  const achievements = [
    {
      id: '1',
      title: 'Daily Calorie Target Met 🎯',
      desc: isGoalMetToday
        ? `Great job! You stayed under your ${targetCalorieGoal} kcal limit today.`
        : isOverGoal
        ? `Intake: ${todayCalories} kcal (Target: ${targetCalorieGoal} kcal).`
        : 'Snap a photo of your meal on the Home tab to log calories.',
      points: 150,
      unlocked: isGoalMetToday,
      icon: 'flame',
    },
    {
      id: '2',
      title: `${streakDays}-Day Logging Streak 🔥`,
      desc: `Logged meal scans across ${streakDays} active days.`,
      points: streakDays * 100,
      unlocked: streakDays > 0,
      icon: 'trophy',
    },
    {
      id: '3',
      title: 'Protein & Macro Balance 🥩',
      desc: 'Hit balanced protein & nutrient distribution.',
      points: 200,
      unlocked: mealLogs.length > 0,
      icon: 'fitness',
    },
    {
      id: '4',
      title: 'MealPulse PRO Champion 👑',
      desc: isPro ? 'Active PRO Member Bonus Points.' : 'Upgrade to PRO to unlock +500 Bonus Points.',
      points: 500,
      unlocked: isPro,
      icon: 'sparkles',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Daily Score & Rewards 🏆</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Calorie Compliance & Active Streaks</Text>
          </View>

          <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.inputBg }]} onPress={loadUserRewards}>
            <Ionicons name="refresh" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Daily Compliance Hero Card */}
        <View style={styles.scoreHeroCard}>
          <View style={styles.scoreHeaderRow}>
            <View style={styles.scoreBadge}>
              <Ionicons name="sparkles" size={14} color="#84CC16" />
              <Text style={styles.scoreBadgeText}>TODAY COMPLIANCE SCORE</Text>
            </View>
            <Text style={styles.streakText}>🔥 {streakDays} Day Streak</Text>
          </View>

          <View style={styles.scoreValRow}>
            <Text style={styles.scoreValNum}>{dailyScore}</Text>
            <Text style={styles.scoreUnit}>/ 100 pts</Text>
          </View>

          <Text style={styles.scoreFeedback}>
            {todayCalories === 0
              ? 'No meals logged yet today. Snap a photo on the Home tab to earn today score!'
              : isGoalMetToday
              ? `🎉 Perfect! ${todayCalories} kcal logged (Inside ${targetCalorieGoal} kcal target).`
              : `⚠️ ${todayCalories} kcal logged (${todayCalories - targetCalorieGoal} kcal over target).`}
          </Text>

          <View style={styles.pointsPillRow}>
            <Ionicons name="ribbon-outline" size={16} color="#0F172A" />
            <Text style={styles.pointsPillText}>Total Earned: {totalPoints} Nutrition Points</Text>
          </View>
        </View>

        {/* Achievements Checklist */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Unlocked Achievements</Text>

          {loading ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#84CC16" />
            </View>
          ) : (
            achievements.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.rewardCard, !item.unlocked && styles.rewardCardLocked]}
                onPress={() => {
                  if (!item.unlocked && item.id === '4') {
                    openPaywall('rewards_pro');
                  } else {
                    Alert.alert(item.title, `${item.desc}\nPoints: +${item.points} pts`);
                  }
                }}
                activeOpacity={0.8}
              >
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

                <View style={[styles.rewardPointsBadge, !item.unlocked && styles.rewardPointsLocked]}>
                  <Text style={[styles.rewardPointsText, !item.unlocked && styles.rewardPointsTextLocked]}>
                    {item.unlocked ? `+${item.points} pts` : 'Locked'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreHeroCard: {
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
  scoreHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FEE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  scoreBadgeText: {
    color: '#84CC16',
    fontSize: 10,
    fontWeight: '800',
  },
  streakText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F97316',
  },
  scoreValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreValNum: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0F172A',
  },
  scoreUnit: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '600',
  },
  scoreFeedback: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 14,
  },
  pointsPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BEF264',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  pointsPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
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
  },
  rewardCardLocked: {
    opacity: 0.75,
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
    fontSize: 14,
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
  rewardPointsLocked: {
    backgroundColor: '#F1F5F9',
  },
  rewardPointsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  rewardPointsTextLocked: {
    color: '#94A3B8',
  },
});
