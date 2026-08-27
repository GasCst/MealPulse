import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { SupabaseService } from '@/services/supabaseService';

interface Habit {
  id: string;
  title: string;
  category: string;
  streak: number;
  completedToday: boolean;
  isProOnly?: boolean;
}

export default function HabitsScreen() {
  const { isPro, openPaywall, user } = useSubscription();
  const { colors, isDarkMode } = useTheme();

  const [habits, setHabits] = useState<Habit[]>([
    { id: '1', title: '25-min Deep Focus Sprint', category: 'Focus', streak: 7, completedToday: true },
    { id: '2', title: 'Cold Water & Morning Goal Review', category: 'Energy', streak: 4, completedToday: true },
    { id: '3', title: 'Review $1k App Roadmap & Analytics', category: 'Nutrition', streak: 12, completedToday: false },
    { id: '4', title: 'Post-Meal 15m Walk', category: 'Movement', streak: 3, completedToday: false, isProOnly: true },
  ]);

  const [newHabitText, setNewHabitText] = useState('');

  const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
  };

  useEffect(() => {
    if (!user?.id) return;
    SupabaseService.fetchUserHabits(user.id).then((cloudHabits) => {
      if (cloudHabits && cloudHabits.length > 0) {
        const mapped: Habit[] = cloudHabits.map((h: any) => ({
          id: h.id,
          title: h.title,
          category: h.category || 'Custom',
          streak: h.streak || 0,
          completedToday: h.completed_today ?? false,
          isProOnly: h.is_pro_only ?? false,
        }));
        setHabits(mapped);
      }
    });
  }, [user]);

  const toggleHabit = async (id: string) => {
    let updatedHabit: Habit | undefined;
    triggerHaptic('success');

    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const nextCompleted = !h.completedToday;
          updatedHabit = {
            ...h,
            completedToday: nextCompleted,
            streak: nextCompleted ? h.streak + 1 : Math.max(0, h.streak - 1),
          };
          return updatedHabit;
        }
        return h;
      })
    );

    if (updatedHabit && user?.id) {
      await SupabaseService.updateUserHabit(id, {
        completed_today: updatedHabit.completedToday,
        streak: updatedHabit.streak,
      });
    }
  };

  const handleAddHabit = async () => {
    if (!isPro && habits.length >= 3) {
      triggerHaptic('medium');
      openPaywall('habit_limit');
      return;
    }

    if (!newHabitText.trim()) return;

    triggerHaptic('medium');
    const title = newHabitText.trim();
    setNewHabitText('');

    if (user?.id) {
      const created = await SupabaseService.saveUserHabit(user.id, {
        title,
        category: 'Custom',
        streak: 1,
        completedToday: true,
      });

      if (created) {
        const newHabit: Habit = {
          id: created.id,
          title: created.title,
          category: created.category || 'Custom',
          streak: created.streak || 1,
          completedToday: created.completed_today ?? true,
        };
        setHabits((prev) => [...prev, newHabit]);
        return;
      }
    }

    const newHabit: Habit = {
      id: Date.now().toString(),
      title,
      category: 'Custom',
      streak: 1,
      completedToday: true,
    };
    setHabits((prev) => [...prev, newHabit]);
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>Habit & Streak Studio</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Daily consistency compounds your fitness results</Text>
          </View>

          <TouchableOpacity
            style={[styles.streakBadge, { backgroundColor: colors.limeGlow, borderColor: colors.lime }]}
            onPress={() => {
              triggerHaptic('light');
              Alert.alert('Top Streak', '🔥 12-day streak on Nutrition Logging!');
            }}
          >
            <Ionicons name="flame" size={16} color={colors.lime} />
            <Text style={[styles.streakBadgeText, { color: colors.lime }]}>12 Days</Text>
          </TouchableOpacity>
        </View>

        {/* Add Habit Box */}
        <Animated.View
          entering={FadeInUp.duration(500)}
          style={[styles.addCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
        >
          <Text style={[styles.addTitle, { color: colors.textPrimary }]}>Create Daily Habit</Text>
          <View style={styles.addInputRow}>
            <TextInput
              style={[
                styles.addInput,
                { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder },
              ]}
              placeholder="e.g. 500ml water before breakfast..."
              placeholderTextColor={colors.textMuted}
              value={newHabitText}
              onChangeText={setNewHabitText}
            />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.lime }]} onPress={handleAddHabit} activeOpacity={0.85}>
              <Ionicons name="add" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>
          {!isPro && (
            <Text style={[styles.limitNotice, { color: colors.amber }]}>
              ⚠️ Free Plan: 3 Habit slots limit ({habits.length}/3 used)
            </Text>
          )}
        </Animated.View>

        {/* Habits List */}
        <View style={styles.listSection}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Today&apos;s Habits</Text>

          {habits.map((habit, idx) => {
            const lockedForFree = !isPro && habit.isProOnly;
            return (
              <Animated.View
                key={habit.id}
                entering={FadeInUp.delay(80 + idx * 50).duration(400)}
              >
                <TouchableOpacity
                  style={[
                    styles.habitCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                    habit.completedToday && {
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                      backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4',
                    },
                    lockedForFree && {
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.06)' : '#FFFBEB',
                    },
                  ]}
                  onPress={() => {
                    if (lockedForFree) {
                      triggerHaptic('medium');
                      openPaywall('pro_habit');
                    } else {
                      toggleHabit(habit.id);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.habitLeft}>
                    <Ionicons
                      name={
                        lockedForFree
                          ? 'lock-closed'
                          : habit.completedToday
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={24}
                      color={
                        lockedForFree
                          ? colors.amber
                          : habit.completedToday
                          ? colors.emerald
                          : colors.textMuted
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.habitTitle,
                          { color: colors.textPrimary },
                          habit.completedToday && styles.habitTitleCompleted,
                        ]}
                      >
                        {habit.title}
                      </Text>
                      <View style={[styles.categoryPill, { backgroundColor: colors.inputBg }]}>
                        <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{habit.category}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.habitRight}>
                    {lockedForFree ? (
                      <View style={[styles.proTag, { backgroundColor: colors.amber }]}>
                        <Text style={styles.proTagText}>PRO</Text>
                      </View>
                    ) : (
                      <View style={[styles.streakPill, { backgroundColor: colors.limeGlow }]}>
                        <Ionicons name="flame" size={13} color={colors.lime} />
                        <Text style={[styles.streakText, { color: colors.lime }]}>{habit.streak}d</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
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
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  addCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  addTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitNotice: {
    fontSize: 11.5,
    marginTop: 8,
    fontWeight: '700',
  },
  listSection: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  habitCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  habitTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  habitTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  habitRight: {
    marginLeft: 10,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '900',
  },
  proTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proTagText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '900',
  },
});
