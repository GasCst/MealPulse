import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { SupabaseService, CloudMealLog } from '@/services/supabaseService';
import { PaywallModal } from '@/components/PaywallModal';
import { AdBanner } from '@/components/AdBanner';

export default function LogScreen() {
  const { user } = useSubscription();
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();

  const [historyMeals, setHistoryMeals] = useState<CloudMealLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [waterMl, setWaterMl] = useState(1750);

  const waterTarget = 2500;
  const waterGlasses = Math.floor(waterMl / 250);

  useEffect(() => {
    loadCloudMealHistory();
  }, [user]);

  const loadCloudMealHistory = async () => {
    setLoading(true);
    const data = await SupabaseService.fetchMealLogsHistory(user?.id);
    setHistoryMeals(data);
    setLoading(false);
  };

  const handleAddWater = () => {
    if (waterMl < 3500) {
      setWaterMl(waterMl + 250);
    }
  };

  // Group meals by date (YYYY-MM-DD)
  const groupedMeals: Record<string, CloudMealLog[]> = {};
  historyMeals.forEach((meal) => {
    const dateKey = meal.logged_at ? meal.logged_at.split('T')[0] : 'Today';
    if (!groupedMeals[dateKey]) {
      groupedMeals[dateKey] = [];
    }
    groupedMeals[dateKey].push(meal);
  });

  const sortedDates = Object.keys(groupedMeals).sort((a, b) => b.localeCompare(a));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Meal History & Hydration 📜</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>All Scanned Meals Saved Per Account</Text>
          </View>
          <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.inputBg }]} onPress={loadCloudMealHistory}>
            <Ionicons name="refresh" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Water Intake Tracker Hero Card */}
        <View style={[styles.waterCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 }]}>
          <View style={styles.waterHeaderRow}>
            <View style={styles.waterBadge}>
              <Ionicons name="water" size={14} color="#0EA5E9" />
              <Text style={styles.waterBadgeText}>HYDRATION TRACKER</Text>
            </View>
            <Text style={styles.waterGoalText}>Target: {waterTarget} ml (10 glasses)</Text>
          </View>

          <View style={styles.waterAmountRow}>
            <Text style={styles.waterAmountVal}>{waterMl}</Text>
            <Text style={styles.waterUnit}>ml logged</Text>
            <TouchableOpacity style={styles.addWaterBtn} onPress={handleAddWater} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color="#0F172A" />
              <Text style={styles.addWaterBtnText}>+250 ml</Text>
            </TouchableOpacity>
          </View>

          {/* Glasses Grid */}
          <View style={styles.glassesGrid}>
            {[...Array(10)].map((_, idx) => {
              const isFilled = idx < waterGlasses;
              return (
                <View
                  key={idx}
                  style={[styles.glassIconBox, isFilled && styles.glassIconBoxFilled]}
                >
                  <Ionicons
                    name="water"
                    size={16}
                    color={isFilled ? '#0EA5E9' : '#94A3B8'}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Cloud Meal History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeader}>Saved Scanned Meals Timeline</Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#84CC16" />
              <Text style={styles.loadingText}>Fetching cloud meal logs...</Text>
            </View>
          ) : sortedDates.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="cloud-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Cloud Meal Scans Yet</Text>
              <Text style={styles.emptySub}>
                {user ? 'Snap a photo on the Home tab to save your first meal to Supabase!' : 'Sign in to save your AI photo meal scans to your account.'}
              </Text>
            </View>
          ) : (
            sortedDates.map((dateStr) => {
              const dayMeals = groupedMeals[dateStr];
              const dayTotalCal = dayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);

              const targetDate = dateStr === 'Today' ? new Date() : new Date(dateStr);
              const formattedDate = isNaN(targetDate.getTime())
                ? dateStr
                : targetDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

              return (
                <View key={dateStr} style={styles.dayGroupCard}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <Ionicons name="calendar-outline" size={16} color="#84CC16" />
                      <Text style={styles.dayDateTitle}>{formattedDate}</Text>
                    </View>
                    <Text style={styles.dayTotalCal}>{dayTotalCal} kcal total</Text>
                  </View>

                  <View style={styles.dayMealsList}>
                    {dayMeals.map((meal) => (
                      <View key={meal.id} style={styles.mealItemRow}>
                        {meal.image_url ? (
                          <Image source={{ uri: meal.image_url }} style={styles.mealImg} />
                        ) : (
                          <View style={styles.mealIconPlaceholder}>
                            <Ionicons name="restaurant" size={16} color="#84CC16" />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mealName}>{meal.food_name}</Text>
                          <Text style={styles.mealMacros}>
                            P: {meal.protein_g || 0}g • C: {meal.carbs_g || 0}g • F: {meal.fat_g || 0}g
                            {meal.estimated_weight_g ? ` • ⚖️ ${meal.estimated_weight_g}g` : ''}
                          </Text>
                        </View>
                        <Text style={styles.mealCal}>{meal.calories} kcal</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
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
  waterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#0EA5E9',
    marginBottom: 24,
  },
  waterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  waterBadgeText: {
    color: '#0EA5E9',
    fontSize: 10,
    fontWeight: '800',
  },
  waterGoalText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  waterAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  waterAmountVal: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
  },
  waterUnit: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
    flex: 1,
  },
  addWaterBtn: {
    backgroundColor: '#BEF264',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addWaterBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  glassesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 14,
  },
  glassIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassIconBoxFilled: {
    backgroundColor: '#E0F2FE',
  },
  historySection: {
    gap: 14,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  dayGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayDateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dayTotalCal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#84CC16',
  },
  dayMealsList: {
    gap: 12,
  },
  mealItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealImg: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  mealIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F7FEE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  mealMacros: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  mealCal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
});
