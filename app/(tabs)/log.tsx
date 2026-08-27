import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { SupabaseService, CloudMealLog } from '@/services/supabaseService';
import { PaywallModal } from '@/components/PaywallModal';
import { AdBanner } from '@/components/AdBanner';

export default function LogScreen() {
  const { user, burnedCaloriesToday, stepsToday, waterIntakeToday, updateWaterIntake, waterTarget } = useSubscription();
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();

  const [historyMeals, setHistoryMeals] = useState<CloudMealLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const targetMl = waterTarget || 2500;
  const totalGlassesCount = Math.max(8, Math.round(targetMl / 250));
  const waterGlasses = Math.floor(waterIntakeToday / 250);

  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
  };

  const loadCloudMealHistory = useCallback(async () => {
    try {
      const data = await SupabaseService.fetchMealLogsHistory(user?.id);
      setHistoryMeals(data);
    } catch (e) {
      console.warn('Error fetching meal logs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadCloudMealHistory();
    }, [loadCloudMealHistory])
  );

  const onRefresh = () => {
    triggerHaptic('light');
    setRefreshing(true);
    loadCloudMealHistory();
  };

  const handleAddWater = () => {
    triggerHaptic('medium');
    updateWaterIntake(250);
  };

  const handleRemoveWater = () => {
    triggerHaptic('medium');
    if (waterIntakeToday > 0) {
      updateWaterIntake(-250);
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
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime}
            colors={[colors.lime]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('log_history_title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('log_history_sub')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color={colors.lime} />
          </TouchableOpacity>
        </View>

        {/* Water Intake Tracker Hero Card */}
        <Animated.View
          entering={FadeInUp.duration(500)}
          style={[styles.waterCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
        >
          <View style={styles.waterHeaderRow}>
            <View style={[styles.waterBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Ionicons name="water" size={14} color={colors.sky} />
              <Text style={[styles.waterBadgeText, { color: colors.sky }]}>{t('hydration_tracker_title')}</Text>
            </View>
            <Text style={[styles.waterGoalText, { color: colors.textSecondary }]}>
              {t('target_label')} {targetMl} ml ({totalGlassesCount} {t('glasses_unit')})
            </Text>
          </View>

          <View style={styles.waterAmountRow}>
            <Text style={[styles.waterAmountVal, { color: colors.textPrimary }]}>{waterIntakeToday}</Text>
            <Text style={[styles.waterUnit, { color: colors.textSecondary }]}>ml</Text>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              {waterIntakeToday > 0 && (
                <TouchableOpacity
                  style={[styles.addWaterBtn, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}
                  onPress={handleRemoveWater}
                  activeOpacity={0.8}
                >
                  <Ionicons name="remove" size={18} color="#EF4444" />
                  <Text style={[styles.addWaterBtnText, { color: '#EF4444' }]}>-250 ml</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.addWaterBtn, { backgroundColor: colors.lime }]}
                onPress={handleAddWater}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#0F172A" />
                <Text style={[styles.addWaterBtnText, { color: '#0F172A' }]}>+250 ml</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Glasses Grid */}
          <View style={[styles.glassesGrid, { backgroundColor: colors.inputBg }]}>
            {[...Array(totalGlassesCount)].map((_, idx) => {
              const isFilled = idx < waterGlasses;
              return (
                <View
                  key={idx}
                  style={[
                    styles.glassIconBox,
                    { backgroundColor: colors.cardBg },
                    isFilled && { backgroundColor: 'rgba(56, 189, 248, 0.2)' },
                  ]}
                >
                  <Ionicons
                    name="water"
                    size={16}
                    color={isFilled ? colors.sky : colors.textMuted}
                  />
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Activity & Burned Calories Summary Banner */}
        {(burnedCaloriesToday > 0 || stepsToday > 0) && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            style={[
              styles.activityBannerCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 },
            ]}
          >
            <View style={styles.waterHeaderRow}>
              <View style={[styles.waterBadge, { backgroundColor: colors.limeGlow }]}>
                <Ionicons name="flame" size={14} color={colors.lime} />
                <Text style={[styles.waterBadgeText, { color: colors.lime }]}>{t('health_sync_section_title')}</Text>
              </View>
              <Text style={[styles.waterGoalText, { color: colors.textPrimary, fontWeight: '700' }]}>
                {burnedCaloriesToday} kcal • {stepsToday.toLocaleString()} {t('steps_unit')}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Cloud Meal History Section */}
        <View style={styles.historySection}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>{t('log_history_sub')}</Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.lime} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading meals...</Text>
            </View>
          ) : sortedDates.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Ionicons name="cloud-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('no_food_logged_yet')}</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {t('add_items_to_track')}
              </Text>
            </View>
          ) : (
            sortedDates.map((dateStr, dIdx) => {
              const dayMeals = groupedMeals[dateStr];
              const dayTotalCal = dayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);

              const targetDate = dateStr === 'Today' ? new Date() : new Date(dateStr);
              const formattedDate = isNaN(targetDate.getTime())
                ? dateStr
                : targetDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });

              return (
                <Animated.View
                  key={dateStr}
                  entering={FadeInUp.delay(150 + dIdx * 50).duration(400)}
                  style={[styles.dayGroupCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                >
                  <View style={[styles.dayHeader, { borderBottomColor: colors.cardBorder }]}>
                    <View style={styles.dayHeaderLeft}>
                      <Ionicons name="calendar-outline" size={16} color={colors.lime} />
                      <Text style={[styles.dayDateTitle, { color: colors.textPrimary }]}>{formattedDate}</Text>
                    </View>
                    <Text style={[styles.dayTotalCal, { color: colors.lime }]}>{dayTotalCal} kcal total</Text>
                  </View>

                  <View style={styles.dayMealsList}>
                    {dayMeals.map((meal) => (
                      <View key={meal.id} style={styles.mealItemRow}>
                        {meal.image_url ? (
                          <Image source={{ uri: meal.image_url }} style={styles.mealImg} />
                        ) : (
                          <View style={[styles.mealIconPlaceholder, { backgroundColor: colors.limeGlow }]}>
                            <Ionicons name="restaurant" size={16} color={colors.lime} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.mealName, { color: colors.textPrimary }]}>{meal.food_name}</Text>
                          <Text style={[styles.mealMacros, { color: colors.textSecondary }]}>
                            P: {meal.protein_g || 0}g • C: {meal.carbs_g || 0}g • F: {meal.fat_g || 0}g
                            {meal.estimated_weight_g ? ` • ⚖️ ${meal.estimated_weight_g}g` : ''}
                          </Text>
                        </View>
                        <Text style={[styles.mealCal, { color: colors.textPrimary }]}>{meal.calories} kcal</Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              );
            })
          )}
        </View>

        <View style={{ marginTop: 20 }}>
          <AdBanner location="log_screen" />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  activityBannerCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  waterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  waterGoalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  waterAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  waterAmountVal: {
    fontSize: 36,
    fontWeight: '900',
  },
  waterUnit: {
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
  addWaterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addWaterBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  glassesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
  },
  glassIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historySection: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyBox: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  dayGroupCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayDateTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  dayTotalCal: {
    fontSize: 13,
    fontWeight: '900',
  },
  dayMealsList: {
    gap: 10,
  },
  mealItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealImg: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  mealIconPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 14,
    fontWeight: '800',
  },
  mealMacros: {
    fontSize: 11,
    marginTop: 2,
  },
  mealCal: {
    fontSize: 13,
    fontWeight: '800',
  },
});
