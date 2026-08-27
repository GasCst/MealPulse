import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { SupabaseService, CloudMealLog, DailyActivityCloud } from '@/services/supabaseService';
import { PaywallModal } from '@/components/PaywallModal';

export default function StatisticsScreen() {
  const { user, openPaywall, targetCalories, burnedCaloriesToday, stepsToday } = useSubscription();
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [weeklyLogs, setWeeklyLogs] = useState<CloudMealLog[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<DailyActivityCloud[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  const targetCalorieGoal = targetCalories;

  useEffect(() => {
    loadWeeklyAnalytics();
  }, [user]);

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  const loadWeeklyAnalytics = async () => {
    triggerHaptic();
    setLoading(true);
    const mealsData = await SupabaseService.fetchMealLogsHistory(user?.id);
    setWeeklyLogs(mealsData);

    if (user?.id) {
      const activityData = await SupabaseService.getActivityHistory(user.id, 7);
      setWeeklyActivity(activityData);
    }
    setLoading(false);
  };

  // Total active burned calories & steps across the week
  const cloudBurnedWeek = weeklyActivity.reduce((acc, act) => acc + Number(act.active_calories || 0), 0);
  const totalBurnedWeek = Math.max(cloudBurnedWeek, burnedCaloriesToday);
  const cloudStepsWeek = weeklyActivity.reduce((acc, act) => acc + Number(act.steps || 0), 0);
  const totalStepsWeek = Math.max(cloudStepsWeek, stepsToday);

  // Group meals by day of week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCalorieTotals: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0,
  };

  let totalCaloriesWeek = 0;
  let totalProteinWeek = 0;
  let totalCarbsWeek = 0;
  let totalFatWeek = 0;

  weeklyLogs.forEach((meal) => {
    if (meal.logged_at) {
      const d = new Date(meal.logged_at);
      const dayName = daysOfWeek[d.getDay()];
      if (dayCalorieTotals[dayName] !== undefined) {
        dayCalorieTotals[dayName] += Number(meal.calories || 0);
      }
    }
    totalCaloriesWeek += Number(meal.calories || 0);
    totalProteinWeek += Number(meal.protein_g || 0);
    totalCarbsWeek += Number(meal.carbs_g || 0);
    totalFatWeek += Number(meal.fat_g || 0);
  });

  const chartOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayDayName = daysOfWeek[new Date().getDay()];

  const chartData = chartOrder.map((day) => {
    const cal = dayCalorieTotals[day];
    const percent = Math.min(150, Math.round((cal / targetCalorieGoal) * 100));
    const fillHeight = `${Math.min(100, Math.max(10, percent))}%`;
    return {
      day,
      calories: cal,
      percent,
      fillHeight,
      isHighlight: day === todayDayName,
    };
  });

  const todayCalories = dayCalorieTotals[todayDayName] || 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topHeaderBar}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('macro_stats_title')}</Text>
          <TouchableOpacity
            style={[styles.circleBackBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
            onPress={loadWeeklyAnalytics}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color={colors.lime} />
          </TouchableOpacity>
        </View>

        {/* Period Selector Tabs */}
        <View style={[styles.periodSelector, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
          {(['day', 'week', 'month'] as const).map((p) => {
            const isSelected = period === p;
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodTab,
                  isSelected && [styles.periodTabActive, { backgroundColor: colors.lime }],
                ]}
                onPress={() => {
                  triggerHaptic();
                  setPeriod(p);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    { color: isSelected ? '#0F172A' : colors.textSecondary },
                    isSelected && { fontWeight: '900' },
                  ]}
                >
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hero Calories Counter */}
        <Animated.View
          entering={FadeInUp.duration(500)}
          style={[styles.caloriesHeroSection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
        >
          <Text style={[styles.caloriesLabel, { color: colors.textSecondary }]}>{t('todays_logged_calories')}</Text>
          <View style={styles.caloriesNumberRow}>
            <Text style={[styles.caloriesBigVal, { color: colors.lime }]}>{todayCalories}</Text>
            <Text style={[styles.kcalUnit, { color: colors.textSecondary }]}>{t('kcal')}</Text>
            <Text style={[styles.targetCalText, { color: colors.textSecondary }]}>
              {t('target_label')} <Text style={[styles.targetBold, { color: colors.textPrimary }]}>{targetCalorieGoal} {t('kcal')}</Text>
            </Text>
          </View>
        </Animated.View>

        {/* Bar Chart Container */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(500)}
          style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          <View style={styles.chartTitleRow}>
            <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{t('weekly_compliance_title')}</Text>
            <Text style={[styles.chartSub, { color: colors.textSecondary }]}>{t('target_sub_day').replace('{target}', String(targetCalorieGoal))}</Text>
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.lime} />
            </View>
          ) : (
            <View style={styles.barsFlexRow}>
              {chartData.map((item, idx) => (
                <View key={idx} style={styles.chartColumn}>
                  <Text
                    style={[
                      styles.percentLabel,
                      { color: item.isHighlight ? colors.lime : colors.textMuted },
                      item.isHighlight && styles.percentLabelHighlight,
                    ]}
                  >
                    {item.percent}%
                  </Text>

                  <View style={[styles.barTrack, { backgroundColor: isDarkMode ? '#242D3C' : '#E2E8F0' }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: item.fillHeight as any,
                          backgroundColor: item.isHighlight ? colors.lime : colors.accentGreen,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.dayText,
                      { color: item.isHighlight ? colors.textPrimary : colors.textSecondary },
                      item.isHighlight && { fontWeight: '900', color: colors.lime },
                    ]}
                  >
                    {item.day}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Grid Activity & Health Cards */}
        <View style={styles.gridSection}>
          {/* Active Calories Burned Card */}
          <Animated.View
            entering={FadeInUp.delay(150).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 107, 74, 0.15)' }]}>
                <Ionicons name="flame" size={16} color={colors.coral} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{t('burned_calories_weekly')}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {Math.round(totalBurnedWeek)} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('kcal')}</Text>
            </Text>
          </Animated.View>

          {/* Steps Card */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Ionicons name="footsteps" size={16} color={colors.sky} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{t('steps_unit')}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {totalStepsWeek > 0 ? totalStepsWeek.toLocaleString() : '0'} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('steps_unit')}</Text>
            </Text>
          </Animated.View>

          {/* Protein Card */}
          <Animated.View
            entering={FadeInUp.delay(250).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="fitness" size={16} color={colors.emerald} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{t('protein_total')}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {Math.round(totalProteinWeek)} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('grams')}</Text>
            </Text>
          </Animated.View>

          {/* Carbs Card */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="nutrition" size={16} color={colors.amber} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{t('carbs_total')}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {Math.round(totalCarbsWeek)} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('grams')}</Text>
            </Text>
          </Animated.View>

          {/* Fat Card */}
          <Animated.View
            entering={FadeInUp.delay(350).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 107, 74, 0.15)' }]}>
                <Ionicons name="pie-chart" size={16} color={colors.coral} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{t('fat_total')}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {Math.round(totalFatWeek)} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('grams')}</Text>
            </Text>
          </Animated.View>

          {/* Total Meals Card */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.limeGlow }]}>
                <Ionicons name="camera" size={16} color={colors.lime} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{t('scanned_meals_count')}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {weeklyLogs.length} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('meals_unit')}</Text>
            </Text>
          </Animated.View>
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
    paddingTop: 12,
    paddingBottom: 100,
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  circleBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodTabActive: {
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  caloriesHeroSection: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  caloriesLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  caloriesNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  caloriesBigVal: {
    fontSize: 36,
    fontWeight: '900',
  },
  kcalUnit: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  targetCalText: {
    fontSize: 13,
  },
  targetBold: {
    fontWeight: '900',
  },
  chartCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  chartTitleRow: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  chartSub: {
    fontSize: 12,
    marginTop: 2,
  },
  barsFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
  },
  chartColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    flex: 1,
  },
  percentLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  percentLabelHighlight: {
    fontWeight: '900',
  },
  barTrack: {
    width: 18,
    height: 120,
    borderRadius: 9,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    width: '100%',
    borderRadius: 9,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gridSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  gridValNum: {
    fontSize: 20,
    fontWeight: '900',
  },
  gridValUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
});
