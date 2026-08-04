import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { SupabaseService, CloudMealLog } from '@/services/supabaseService';
import { PaywallModal } from '@/components/PaywallModal';

export default function StatisticsScreen() {
  const { user, openPaywall } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [weeklyLogs, setWeeklyLogs] = useState<CloudMealLog[]>([]);

  const targetCalorieGoal = 1920;

  useEffect(() => {
    loadWeeklyAnalytics();
  }, [user]);

  const loadWeeklyAnalytics = async () => {
    setLoading(true);
    const data = await SupabaseService.fetchMealLogsHistory(user?.id);
    setWeeklyLogs(data);
    setLoading(false);
  };

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Top Header Bar */}
        <View style={styles.topHeaderBar}>
          <Text style={styles.headerTitle}>Real Macro Statistics 📊</Text>
          <TouchableOpacity style={styles.circleBackBtn} onPress={loadWeeklyAnalytics}>
            <Ionicons name="refresh" size={18} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* Hero Calories Counter */}
        <View style={styles.caloriesHeroSection}>
          <Text style={styles.caloriesLabel}>Today's Logged Calories</Text>
          <View style={styles.caloriesNumberRow}>
            <Text style={styles.caloriesBigVal}>{todayCalories}</Text>
            <Text style={styles.kcalUnit}>Kcal</Text>
            <Text style={styles.targetCalText}>
              Target: <Text style={styles.targetBold}>{targetCalorieGoal} Kcal</Text>
            </Text>
          </View>
        </View>

        {/* Bar Chart Container */}
        <View style={styles.chartCard}>
          <View style={styles.chartTitleRow}>
            <Text style={styles.chartTitle}>Weekly Daily Calorie Compliance</Text>
            <Text style={styles.chartSub}>Target: {targetCalorieGoal} kcal/day</Text>
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#84CC16" />
            </View>
          ) : (
            <View style={styles.barsFlexRow}>
              {chartData.map((item, idx) => (
                <View key={idx} style={styles.chartColumn}>
                  <Text style={[styles.percentLabel, item.isHighlight && styles.percentLabelHighlight]}>
                    {item.percent}%
                  </Text>

                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: item.fillHeight as any },
                        item.isHighlight && styles.barFillHighlight,
                      ]}
                    />
                  </View>

                  <Text style={styles.dayText}>{item.day}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 4-Grid Activity & Health Cards */}
        <View style={styles.gridSection}>
          {/* Protein Card */}
          <View style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="fitness" size={16} color="#16A34A" />
              </View>
              <Text style={styles.gridCardTitle}>Protein Total</Text>
            </View>
            <Text style={styles.gridValNum}>
              {Math.round(totalProteinWeek)} <Text style={styles.gridValUnit}>grams</Text>
            </Text>
          </View>

          {/* Carbs Card */}
          <View style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="nutrition" size={16} color="#F97316" />
              </View>
              <Text style={styles.gridCardTitle}>Carbs Total</Text>
            </View>
            <Text style={styles.gridValNum}>
              {Math.round(totalCarbsWeek)} <Text style={styles.gridValUnit}>grams</Text>
            </Text>
          </View>

          {/* Fat Card */}
          <View style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="pie-chart" size={16} color="#EF4444" />
              </View>
              <Text style={styles.gridCardTitle}>Fat Total</Text>
            </View>
            <Text style={styles.gridValNum}>
              {Math.round(totalFatWeek)} <Text style={styles.gridValUnit}>grams</Text>
            </Text>
          </View>

          {/* Total Meals Card */}
          <View style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="camera" size={16} color="#0EA5E9" />
              </View>
              <Text style={styles.gridCardTitle}>Scanned Meals</Text>
            </View>
            <Text style={styles.gridValNum}>
              {weeklyLogs.length} <Text style={styles.gridValUnit}>meals</Text>
            </Text>
          </View>
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
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  circleBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  caloriesHeroSection: {
    marginBottom: 20,
  },
  caloriesLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  caloriesNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  caloriesBigVal: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
  },
  kcalUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 10,
  },
  targetCalText: {
    fontSize: 13,
    color: '#64748B',
  },
  targetBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  chartTitleRow: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  chartSub: {
    fontSize: 12,
    color: '#64748B',
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
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  percentLabelHighlight: {
    color: '#0F172A',
    fontWeight: '900',
  },
  barTrack: {
    width: 18,
    height: 120,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    width: '100%',
    backgroundColor: '#BEF264',
    borderRadius: 9,
  },
  barFillHighlight: {
    backgroundColor: '#84CC16',
  },
  dayText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  gridSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  gridValNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  gridValUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
});
