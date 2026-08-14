import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpoGoSafeAsyncStorage, SupabaseService } from '@/services/supabaseService';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';

const WATER_STORAGE_KEY = '@mealpulse_water_intake_v1';

export const WaterTrackerCard: React.FC = () => {
  const { t } = useLanguage();
  const { user, waterTarget, beginWrite, endWrite } = useSubscription();
  const [waterMl, setWaterMl] = useState<number>(1250);
  const targetMl = waterTarget || 2500;

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadWater();
  }, [user, todayStr]);

  const loadWater = async () => {
    try {
      if (user?.id) {
        const cloudLog = await SupabaseService.getWaterLog(user.id, todayStr);
        if (cloudLog && cloudLog.amount_ml !== undefined) {
          setWaterMl(Number(cloudLog.amount_ml));
          return;
        }
      }

      const todayKey = user?.id ? `${WATER_STORAGE_KEY}_${user.id}_${todayStr}` : `${WATER_STORAGE_KEY}_guest_${todayStr}`;
      const saved = await ExpoGoSafeAsyncStorage.getItem(todayKey);
      if (saved) {
        setWaterMl(parseInt(saved, 10) || 0);
      } else {
        setWaterMl(0);
      }
    } catch (e) {
      console.warn('Error loading water intake:', e);
    }
  };

  const updateWaterIntake = async (delta: number) => {
    beginWrite();
    try {
      const nextVal = Math.max(0, Math.min(5000, waterMl + delta));
      setWaterMl(nextVal);
      const todayKey = user?.id ? `${WATER_STORAGE_KEY}_${user.id}_${todayStr}` : `${WATER_STORAGE_KEY}_guest_${todayStr}`;
      await ExpoGoSafeAsyncStorage.setItem(todayKey, nextVal.toString());
      if (user?.id) {
        await SupabaseService.saveWaterLog(user.id, todayStr, nextVal, targetMl);
      }
    } catch (e) {
      console.warn('Error saving water intake:', e);
    } finally {
      endWrite();
    }
  };

  const percent = Math.min(100, Math.round((waterMl / targetMl) * 100));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 18 }}>💧</Text>
          </View>
          <View>
            <Text style={styles.title}>{t('water_tracker_title')}</Text>
            <Text style={styles.sub}>{t('water_tracker_sub')}</Text>
          </View>
        </View>
        <Text style={styles.percentBadge}>{percent}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.currentText}>
          {(waterMl / 1000).toFixed(2)} L <Text style={styles.statSub}>/ {(targetMl / 1000).toFixed(1)} L</Text>
        </Text>
        <Text style={styles.glassesText}>{Math.round(waterMl / 250)} Glasses</Text>
      </View>

      {/* Quick Add & Decrement Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.addBtn, styles.decrementBtn, waterMl === 0 && styles.disabledBtn]}
          onPress={() => updateWaterIntake(-250)}
          disabled={waterMl === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="remove" size={16} color={waterMl === 0 ? '#94A3B8' : '#EF4444'} />
          <Text style={[styles.addBtnText, styles.decrementBtnText, waterMl === 0 && styles.disabledBtnText]}>-250 ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => updateWaterIntake(250)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#0284C7" />
          <Text style={styles.addBtnText}>+250 ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => updateWaterIntake(500)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#0284C7" />
          <Text style={styles.addBtnText}>+500 ml</Text>
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
    borderColor: '#E0F2FE',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
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
    backgroundColor: '#E0F2FE',
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
  percentBadge: {
    backgroundColor: '#E0F2FE',
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  progressBg: {
    height: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
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
    fontWeight: '800',
    color: '#0F172A',
  },
  statSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  glassesText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  decrementBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  decrementBtnText: {
    color: '#EF4444',
  },
  disabledBtn: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  disabledBtnText: {
    color: '#94A3B8',
  },
});
