import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
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

  const [protocol, setProtocol] = useState<'16:8' | '14:10' | '18:6'>('16:8');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(16 * 3600); // Default 16 hours
  const [internalUnlocked, setInternalUnlocked] = useState<boolean>(false);

  const isUnlockedViaAd = externalUnlocked || internalUnlocked;

  const handleUnlockViaAd = () => {
    setInternalUnlocked(true);
    if (onUnlockViaAd) {
      onUnlockViaAd();
    }
  };

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

  const handleSelectProtocol = (p: '16:8' | '14:10' | '18:6') => {
    setProtocol(p);
    const hrs = p === '16:8' ? 16 : p === '14:10' ? 14 : 18;
    setSecondsLeft(hrs * 3600);
    setIsRunning(false);
  };

  const toggleTimer = async () => {
    if (!isPro && !isUnlockedViaAd) {
      onUnlockPro();
      return;
    }
    const nextRunning = !isRunning;
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
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 18 }}>⌛</Text>
          </View>
          <View>
            <Text style={styles.title}>{t('fasting_timer_title')}</Text>
            <Text style={styles.sub}>{t('fasting_timer_sub')}</Text>
          </View>
        </View>

        {!isPro && !isUnlockedViaAd ? (
          <TouchableOpacity style={styles.proBadge} onPress={onUnlockPro}>
            <Ionicons name="lock-closed" size={12} color="#0F172A" />
            <Text style={styles.proBadgeText}>PRO FEATURE</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.statusBadge}>{isRunning ? '⚡ FASTING' : '⏸ PAUSED'}</Text>
        )}
      </View>

      {/* Protocol Selector */}
      <View style={styles.protocolRow}>
        {(['16:8', '14:10', '18:6'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.protocolChip, protocol === p && styles.selectedProtocolChip]}
            onPress={() => handleSelectProtocol(p)}
          >
            <Text style={[styles.protocolText, protocol === p && styles.selectedProtocolText]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Clock Display */}
      <View style={styles.clockContainer}>
        <Text style={styles.clockText}>{formatTime(secondsLeft)}</Text>
        <Text style={styles.clockSub}>
          {isRunning ? `Fasting progress: ${progressPercent}%` : 'Tap Start to begin your fast'}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.mainControlBtn, isRunning ? styles.pauseBtn : styles.startBtn]}
          onPress={toggleTimer}
          activeOpacity={0.85}
        >
          <Ionicons name={isRunning ? 'pause' : 'play'} size={18} color={isRunning ? '#FFFFFF' : '#0F172A'} />
          <Text style={[styles.mainControlText, isRunning && { color: '#FFFFFF' }]}>
            {isRunning ? 'Pause Fast' : 'Start Fasting Timer'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={resetTimer}>
          <Ionicons name="refresh" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
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
    backgroundColor: '#F7FEE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sub: {
    fontSize: 11,
    color: '#64748B',
  },
  proBadge: {
    backgroundColor: '#BEF264',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
    backgroundColor: '#F1F5F9',
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  protocolRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  protocolChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectedProtocolChip: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  protocolText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  selectedProtocolText: {
    color: '#BEF264',
  },
  clockContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
  },
  clockText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 2,
  },
  clockSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mainControlBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  startBtn: {
    backgroundColor: '#BEF264',
  },
  pauseBtn: {
    backgroundColor: '#EF4444',
  },
  mainControlText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  resetBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
