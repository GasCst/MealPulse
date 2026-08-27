import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { SupabaseService } from '@/services/supabaseService';

interface FastingTimerCardProps {
  onUnlockPro: () => void;
  onUnlockViaAd?: () => void;
  isUnlockedViaAd?: boolean;
}

export const FastingTimerCard: React.FC<FastingTimerCardProps> = ({
  onUnlockPro,
  onUnlockViaAd,
  isUnlockedViaAd: externalUnlocked = false,
}) => {
  const { isPro, user } = useSubscription();
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();

  const [protocol, setProtocol] = useState<'16:8' | '14:10' | '18:6'>('16:8');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(16 * 3600); // Default 16 hours
  const [internalUnlocked, setInternalUnlocked] = useState<boolean>(false);

  const isUnlockedViaAd = externalUnlocked || internalUnlocked;

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isRunning) {
      pulseScale.value = withRepeat(
        withTiming(1.04, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [isRunning]);

  const clockPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const totalSeconds = (protocol === '16:8' ? 16 : protocol === '14:10' ? 14 : 18) * 3600;

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsLeft]);

  const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
  };

  const handleSelectProtocol = (p: '16:8' | '14:10' | '18:6') => {
    triggerHaptic('light');
    setProtocol(p);
    const hrs = p === '16:8' ? 16 : p === '14:10' ? 14 : 18;
    setSecondsLeft(hrs * 3600);
    setIsRunning(false);
  };

  const toggleTimer = async () => {
    if (!isPro && !isUnlockedViaAd) {
      triggerHaptic('medium');
      onUnlockPro();
      return;
    }
    const nextRunning = !isRunning;
    triggerHaptic(nextRunning ? 'success' : 'medium');
    setIsRunning(nextRunning);
    if (nextRunning && user?.id) {
      const hrs = protocol === '16:8' ? 16 : protocol === '14:10' ? 14 : 18;
      await SupabaseService.saveFastingLog(user.id, {
        protocol,
        startTime: new Date().toISOString(),
        targetHours: hrs,
        isCompleted: false,
        isUnlockedViaAd,
      });
    }
  };

  const resetTimer = () => {
    triggerHaptic('light');
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100);

  return (
    <Animated.View
      entering={FadeInUp.delay(150).duration(500)}
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
          <View style={[styles.iconCircle, { backgroundColor: colors.limeGlow }]}>
            <Text style={{ fontSize: 18 }}>⌛</Text>
          </View>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('fasting_timer_title')}</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('fasting_timer_sub')}</Text>
          </View>
        </View>

        {!isPro && !isUnlockedViaAd ? (
          <TouchableOpacity style={[styles.proBadge, { backgroundColor: colors.lime }]} onPress={onUnlockPro}>
            <Ionicons name="lock-closed" size={12} color="#0F172A" />
            <Text style={styles.proBadgeText}>{t('pro_feature')}</Text>
          </TouchableOpacity>
        ) : (
          <Text
            style={[
              styles.statusBadge,
              {
                backgroundColor: isRunning ? colors.limeGlow : colors.inputBg,
                color: isRunning ? colors.lime : colors.textSecondary,
              },
            ]}
          >
            {isRunning ? t('fasting_status') : t('paused_status')}
          </Text>
        )}
      </View>

      {/* Protocol Selector */}
      <View style={styles.protocolRow}>
        {(['16:8', '14:10', '18:6'] as const).map((p) => {
          const isSelected = protocol === p;
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.protocolChip,
                { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                isSelected && {
                  backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1',
                  borderColor: colors.lime,
                  borderWidth: 1.5,
                },
              ]}
              onPress={() => handleSelectProtocol(p)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.protocolText,
                  { color: isSelected ? colors.lime : colors.textSecondary },
                  isSelected && { fontWeight: '900' },
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Clock Display */}
      <Animated.View
        style={[
          styles.clockContainer,
          { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
          isRunning && { borderColor: colors.lime, borderWidth: 1.5 },
          clockPulseStyle,
        ]}
      >
        <Text style={[styles.clockText, { color: isRunning ? colors.lime : colors.textPrimary }]}>
          {formatTime(secondsLeft)}
        </Text>
        <Text style={[styles.clockSub, { color: colors.textSecondary }]}>
          {isRunning ? `${t('fasting_progress')}: ${progressPercent}%` : t('tap_start_fast')}
        </Text>
      </Animated.View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.mainControlBtn,
            isRunning ? styles.pauseBtn : [styles.startBtn, { backgroundColor: colors.lime }],
          ]}
          onPress={toggleTimer}
          activeOpacity={0.85}
        >
          <Ionicons name={isRunning ? 'pause' : 'play'} size={18} color={isRunning ? '#FFFFFF' : '#0F172A'} />
          <Text style={[styles.mainControlText, isRunning ? { color: '#FFFFFF' } : { color: '#0F172A' }]}>
            {isRunning ? t('pause_fast') : t('start_fast')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resetBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
          onPress={resetTimer}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={18} color={colors.textSecondary} />
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
    marginBottom: 14,
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
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  protocolRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  protocolChip: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
  },
  protocolText: {
    fontSize: 13,
    fontWeight: '700',
  },
  clockContainer: {
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  clockText: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
  },
  clockSub: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mainControlBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  startBtn: {},
  pauseBtn: {
    backgroundColor: '#EF4444',
  },
  mainControlText: {
    fontSize: 14,
    fontWeight: '900',
  },
  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
