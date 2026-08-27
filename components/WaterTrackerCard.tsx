import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';

interface WaterTrackerCardProps {
  selectedDate?: Date | string;
}

export const WaterTrackerCard: React.FC<WaterTrackerCardProps> = ({ selectedDate }) => {
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();
  const {
    waterTarget,
    getWaterIntakeForDateSync,
    loadWaterIntakeForDate,
    updateWaterIntake,
  } = useSubscription();

  const getDateKey = (d?: Date | string): string => {
    if (!d) return new Date().toISOString().split('T')[0];
    if (typeof d === 'string') return d.includes('T') ? d.split('T')[0] : d;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const currentDateKey = getDateKey(selectedDate);
  const currentIntake = getWaterIntakeForDateSync(currentDateKey);

  useEffect(() => {
    loadWaterIntakeForDate(currentDateKey);
  }, [currentDateKey]);

  const targetMl = waterTarget || 2500;
  const percent = Math.min(100, Math.round((currentIntake / targetMl) * 100));

  const progressShared = useSharedValue(0);

  useEffect(() => {
    progressShared.value = withTiming(percent / 100, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressShared.value * 100}%`,
  }));

  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
  };

  const handleAdd = (amount: number) => {
    triggerHaptic('medium');
    updateWaterIntake(amount, currentDateKey);
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(100).duration(500)}
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <Text style={{ fontSize: 18 }}>💧</Text>
          </View>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('water_tracker_title')}</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('water_tracker_sub')}</Text>
          </View>
        </View>
        <Text style={[styles.percentBadge, { backgroundColor: 'rgba(56, 189, 248, 0.18)', color: '#38BDF8' }]}>
          {percent}%
        </Text>
      </View>

      {/* Progress Bar with animated fill */}
      <View style={[styles.progressBg, { backgroundColor: isDarkMode ? '#202836' : '#E0F2FE' }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: colors.sky }, progressBarStyle]} />
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.currentText, { color: colors.textPrimary }]}>
          {(currentIntake / 1000).toFixed(2)} L <Text style={[styles.statSub, { color: colors.textSecondary }]}>/ {(targetMl / 1000).toFixed(1)} L</Text>
        </Text>
        <Text style={[styles.glassesText, { color: colors.sky }]}>{Math.round(currentIntake / 250)} {t('glasses')}</Text>
      </View>

      {/* Quick Add & Decrement Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[
            styles.addBtn,
            styles.decrementBtn,
            {
              backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
              borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
            },
            currentIntake === 0 && (isDarkMode ? styles.disabledBtnDark : styles.disabledBtn),
          ]}
          onPress={() => handleAdd(-250)}
          disabled={currentIntake === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="remove" size={16} color={currentIntake === 0 ? colors.textMuted : '#EF4444'} />
          <Text style={[styles.addBtnText, styles.decrementBtnText, currentIntake === 0 && { color: colors.textMuted }]}>-250 ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.addBtn,
            {
              backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : '#F0F9FF',
              borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
            },
          ]}
          onPress={() => handleAdd(250)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={colors.sky} />
          <Text style={[styles.addBtnText, { color: colors.sky }]}>+250 ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.addBtn,
            {
              backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : '#F0F9FF',
              borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
            },
          ]}
          onPress={() => handleAdd(500)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={colors.sky} />
          <Text style={[styles.addBtnText, { color: colors.sky }]}>+500 ml</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
  },
  sub: {
    fontSize: 11,
    marginTop: 1,
  },
  percentBadge: {
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  progressBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentText: {
    fontSize: 16,
    fontWeight: '900',
  },
  statSub: {
    fontSize: 12,
    fontWeight: '700',
  },
  glassesText: {
    fontSize: 12,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  decrementBtn: {},
  decrementBtnText: {
    color: '#EF4444',
  },
  disabledBtn: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  disabledBtnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
});
