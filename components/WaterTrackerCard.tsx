import { TouchableOpacity } from '@/components/ui/FeedbackPressable';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
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
import { voiceCoachService } from '@/services/voiceCoachService';
import { useVoiceAction } from '@/hooks/useVoiceAction';
import { VoiceFeatureAdModal } from './VoiceFeatureAdModal';

interface WaterTrackerCardProps {
  selectedDate?: Date | string;
}

export const WaterTrackerCard: React.FC<WaterTrackerCardProps> = ({ selectedDate }) => {
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();
  const {
    isPro,
    openPaywall,
    waterTarget,
    getWaterIntakeForDateSync,
    loadWaterIntakeForDate,
    updateWaterIntake,
  } = useSubscription();
  const [showAdModal, setShowAdModal] = useState(false);
  const { isPlaying: isCoachPlaying, isLoading: isCoachLoading, run: runWaterVoice } = useVoiceAction('water');

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

  const handlePlayCoachWater = async (forcedIntake?: number) => {
    triggerHaptic('medium');
    if (isCoachPlaying) {
      await voiceCoachService.stopAudio();
      return;
    }

    if (!isPro) {
      setShowAdModal(true);
      return;
    }

    await runWaterVoice(() => voiceCoachService.playWaterCheer(forcedIntake !== undefined ? forcedIntake : currentIntake, targetMl));
  };

  const handleAdd = (amount: number) => {
    triggerHaptic('medium');
    const newIntake = currentIntake + amount;
    updateWaterIntake(amount, currentDateKey);
    if (isPro) {
      runWaterVoice(() => voiceCoachService.playWaterCheer(newIntake, targetMl)).catch(() => {});
    }
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[
              styles.coachWaterBtn,
              {
                backgroundColor: isDarkMode ? 'rgba(200, 243, 29, 0.15)' : '#F4FCE3',
                borderColor: isDarkMode ? '#2E491A' : '#D9F99D',
              },
            ]}
            sound={isCoachPlaying ? 'close' : 'voice'} onPress={() => handlePlayCoachWater()}
            disabled={isCoachLoading}
            accessibilityLabel={t(isCoachLoading ? 'voice_loading' : isCoachPlaying ? 'voice_stop' : 'voice_listen')}
            accessibilityState={{ busy: isCoachLoading, disabled: isCoachLoading }}
            activeOpacity={0.8}
          >
            {isCoachLoading ? <ActivityIndicator size="small" color={colors.lime} /> : <Ionicons
              name={isCoachPlaying ? 'volume-high' : 'mic'}
              size={13}
              color={colors.lime}
            />}
            <Text style={[styles.coachWaterBtnText, { color: colors.lime }]}>{isCoachLoading ? t('voice_loading') : 'Coach'}</Text>
          </TouchableOpacity>
          <Text style={[styles.percentBadge, { backgroundColor: 'rgba(56, 189, 248, 0.18)', color: '#38BDF8' }]}>
            {percent}%
          </Text>
        </View>
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
          sound="decrement" onPress={() => handleAdd(-250)}
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
          sound="increment" onPress={() => handleAdd(250)}
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
          sound="increment" onPress={() => handleAdd(500)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={colors.sky} />
          <Text style={[styles.addBtnText, { color: colors.sky }]}>+500 ml</Text>
        </TouchableOpacity>
      </View>

      <VoiceFeatureAdModal
        visible={showAdModal}
        featureTitle="Coach Vocale Idratazione"
        featureDescription="Ascolta l'incitamento personalizzato in tempo reale del tuo Coach vocale per raggiungere il target d'idratazione."
        featureIcon="water"
        onClose={() => setShowAdModal(false)}
        onUnlocked={() => {
          setShowAdModal(false);
          runWaterVoice(() => voiceCoachService.playWaterCheer(currentIntake, targetMl)).catch(() => {});
        }}
        onGoPro={() => openPaywall('water_coach_voice')}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  coachWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  coachWaterBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
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
