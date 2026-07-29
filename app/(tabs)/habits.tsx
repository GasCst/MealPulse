import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { Colors } from '@/constants/theme';
import { PaywallModal } from '@/components/PaywallModal';

interface Habit {
  id: string;
  title: string;
  category: string;
  streak: number;
  completedToday: boolean;
  isProOnly?: boolean;
}

export default function HabitsScreen() {
  const { isPro, openPaywall } = useSubscription();

  const [habits, setHabits] = useState<Habit[]>([
    { id: '1', title: '25-min Deep Focus Sprint', category: 'Focus', streak: 7, completedToday: true },
    { id: '2', title: 'Cold Water & Morning Goal Review', category: 'Energy', streak: 4, completedToday: true },
    { id: '3', title: 'Review $1k App Roadmap & Analytics', category: 'Monetization', streak: 12, completedToday: false },
    { id: '4', title: 'Publish 1 Short Video / Post', category: 'Growth', streak: 3, completedToday: false, isProOnly: true },
  ]);

  const [newHabitText, setNewHabitText] = useState('');

  const toggleHabit = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const nextCompleted = !h.completedToday;
          return {
            ...h,
            completedToday: nextCompleted,
            streak: nextCompleted ? h.streak + 1 : Math.max(0, h.streak - 1),
          };
        }
        return h;
      })
    );
  };

  const handleAddHabit = () => {
    // If not PRO and user has >= 3 habits, trigger paywall!
    if (!isPro && habits.length >= 3) {
      openPaywall('habit_limit');
      return;
    }

    if (!newHabitText.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      title: newHabitText,
      category: 'Custom',
      streak: 1,
      completedToday: true,
    };

    setHabits([...habits, newHabit]);
    setNewHabitText('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Habit & Streak Studio</Text>
            <Text style={styles.subtitle}>Daily consistency drives compound revenue</Text>
          </View>

          <TouchableOpacity
            style={styles.streakBadge}
            onPress={() => Alert.alert('Best Streak', '🔥 12-day streak on Monetization Review!')}
          >
            <Ionicons name="flame" size={16} color="#F59E0B" />
            <Text style={styles.streakBadgeText}>12 Days</Text>
          </TouchableOpacity>
        </View>

        {/* Add Habit Box */}
        <View style={styles.addCard}>
          <Text style={styles.addTitle}>Create New Daily Habit</Text>
          <View style={styles.addInputRow}>
            <TextInput
              style={styles.addInput}
              placeholder="e.g. 10 mins post-writing..."
              placeholderTextColor="#64748B"
              value={newHabitText}
              onChangeText={setNewHabitText}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddHabit}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          {!isPro && (
            <Text style={styles.limitNotice}>
              ⚠️ Free Plan: 3 Habit slots limit ({habits.length}/3 used)
            </Text>
          )}
        </View>

        {/* Habits List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionHeader}>Today&apos;s Habits</Text>

          {habits.map((habit) => {
            const lockedForFree = !isPro && habit.isProOnly;
            return (
              <TouchableOpacity
                key={habit.id}
                style={[
                  styles.habitCard,
                  habit.completedToday && styles.habitCardCompleted,
                  lockedForFree && styles.habitCardLocked,
                ]}
                onPress={() => {
                  if (lockedForFree) {
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
                    size={22}
                    color={
                      lockedForFree
                        ? '#F59E0B'
                        : habit.completedToday
                        ? '#10B981'
                        : '#64748B'
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.habitTitle,
                        habit.completedToday && styles.habitTitleCompleted,
                      ]}
                    >
                      {habit.title}
                    </Text>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryText}>{habit.category}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.habitRight}>
                  {lockedForFree ? (
                    <View style={styles.proTag}>
                      <Text style={styles.proTagText}>PRO</Text>
                    </View>
                  ) : (
                    <View style={styles.streakPill}>
                      <Ionicons name="flame" size={12} color="#F59E0B" />
                      <Text style={styles.streakText}>{habit.streak}d</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  streakBadgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  addCard: {
    backgroundColor: '#131C2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  addTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitNotice: {
    fontSize: 11.5,
    color: '#F59E0B',
    marginTop: 8,
    fontWeight: '600',
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
  habitCard: {
    backgroundColor: '#131C2E',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  habitCardCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  habitCardLocked: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  habitTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  habitTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  habitRight: {
    marginLeft: 10,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 11.5,
    fontWeight: '700',
  },
  proTag: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proTagText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
});
