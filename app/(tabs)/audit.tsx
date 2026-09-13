import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { voiceCoachService } from '@/services/voiceCoachService';
import { ModelVoiceItem } from '@/components/VoiceSelectorModal';
import { VoiceFeatureAdModal } from '@/components/VoiceFeatureAdModal';

export default function AuditRewardsScreen() {
  const { user, isPro, openPaywall } = useSubscription();
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [mealLogs, setMealLogs] = useState<CloudMealLog[]>([]);

  const [coachVoice, setCoachVoice] = useState<ModelVoiceItem | null>(null);
  const [celebrationText, setCelebrationText] = useState<string>('');
  const [isPlayingCelebration, setIsPlayingCelebration] = useState(false);
  const [isLoadingCelebration, setIsLoadingCelebration] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const lastVoiceIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubVoice = voiceCoachService.subscribePreferredVoice((v) => {
      if (lastVoiceIdRef.current && lastVoiceIdRef.current !== v.id) {
        setCelebrationText('');
      }
      lastVoiceIdRef.current = v.id;
      setCoachVoice(v);
    });
    const unsubPlay = voiceCoachService.subscribePlaybackState((playing, loading) => {
      setIsPlayingCelebration(playing);
      setIsLoadingCelebration(loading);
    });
    return () => {
      unsubVoice();
      unsubPlay();
    };
  }, []);

  const targetCalorieGoal = 1920;

  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
  };

  useEffect(() => {
    loadUserRewards();
  }, [user]);

  const loadUserRewards = async () => {
    triggerHaptic('light');
    setLoading(true);
    const data = await SupabaseService.fetchMealLogsHistory(user?.id);
    setMealLogs(data);
    setLoading(false);
  };

  // Group meals by date (YYYY-MM-DD)
  const daysLoggedMap: Record<string, number> = {};
  mealLogs.forEach((m) => {
    const d = m.logged_at ? m.logged_at.split('T')[0] : 'Today';
    daysLoggedMap[d] = (daysLoggedMap[d] || 0) + Number(m.calories || 0);
  });

  const uniqueDaysCount = Object.keys(daysLoggedMap).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCalories = daysLoggedMap[todayStr] || 0;

  // Calorie Goal Compliance Check
  const isGoalMetToday = todayCalories > 0 && todayCalories <= targetCalorieGoal;
  const isOverGoal = todayCalories > targetCalorieGoal;

  // Score Calculation (0 to 100)
  let dailyScore = 100;
  if (todayCalories === 0) {
    dailyScore = 0;
  } else if (todayCalories > targetCalorieGoal) {
    dailyScore = Math.max(50, 100 - Math.round(((todayCalories - targetCalorieGoal) / targetCalorieGoal) * 100));
  } else {
    dailyScore = Math.round((todayCalories / targetCalorieGoal) * 100);
  }

  // Calculate Streak & Points
  const streakDays = Math.max(uniqueDaysCount, todayCalories > 0 ? 1 : 0);
  const totalPoints = (streakDays * 100) + (isGoalMetToday ? 150 : 50) + (isPro ? 500 : 0);

  const startCelebrationPlayback = async () => {
    setIsLoadingCelebration(true);
    try {
      const activeVoice = coachVoice || (await voiceCoachService.getPreferredCoachVoice());
      let text = celebrationText;
      if (!text) {
        text = await voiceCoachService.getStreakCelebration(streakDays, activeVoice);
        setCelebrationText(text);
      }
      await voiceCoachService.playSpeech(text, activeVoice?.id);
    } catch (e) {
      console.warn('[AuditScreen] Celebration audio error:', e);
    } finally {
      setIsLoadingCelebration(false);
    }
  };

  const handlePlayStreakCelebration = async () => {
    triggerHaptic('medium');
    if (isPlayingCelebration) {
      await voiceCoachService.stopAudio();
      return;
    }

    if (!isPro) {
      setShowAdModal(true);
      return;
    }

    await startCelebrationPlayback();
  };

  const achievements = [
    {
      id: '1',
      title: 'Daily Calorie Target Met 🎯',
      desc: isGoalMetToday
        ? `Great job! You stayed under your ${targetCalorieGoal} kcal limit today.`
        : isOverGoal
        ? `Intake: ${todayCalories} kcal (Target: ${targetCalorieGoal} kcal).`
        : 'Snap a photo of your meal on the Home tab to log calories.',
      points: 150,
      unlocked: isGoalMetToday,
      icon: 'flame',
    },
    {
      id: '2',
      title: `${streakDays}-Day Logging Streak 🔥`,
      desc: `Logged meal scans across ${streakDays} active days.`,
      points: streakDays * 100,
      unlocked: streakDays > 0,
      icon: 'trophy',
    },
    {
      id: '3',
      title: 'Protein & Macro Balance 🥩',
      desc: 'Hit balanced protein & nutrient distribution.',
      points: 200,
      unlocked: mealLogs.length > 0,
      icon: 'fitness',
    },
    {
      id: '4',
      title: 'MealPulse PRO Champion 👑',
      desc: isPro ? 'Active PRO Member Bonus Points.' : 'Upgrade to PRO to unlock +500 Bonus Points.',
      points: 500,
      unlocked: isPro,
      icon: 'sparkles',
    },
  ];

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
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('daily_rewards_title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('daily_rewards_sub')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
            onPress={loadUserRewards}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color={colors.lime} />
          </TouchableOpacity>
        </View>

        {/* Daily Compliance Hero Card */}
        <Animated.View
          entering={FadeInUp.duration(500)}
          style={[styles.scoreHeroCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
        >
          <View style={styles.scoreHeaderRow}>
            <View style={[styles.scoreBadge, { backgroundColor: colors.limeGlow }]}>
              <Ionicons name="sparkles" size={14} color={colors.lime} />
              <Text style={[styles.scoreBadgeText, { color: colors.lime }]}>{t('today_compliance_score')}</Text>
            </View>
            <Text style={[styles.streakText, { color: colors.coral }]}>🔥 {streakDays} {t('day_streak')}</Text>
          </View>

          <View style={styles.scoreValRow}>
            <Text style={[styles.scoreValNum, { color: colors.lime }]}>{dailyScore}</Text>
            <Text style={[styles.scoreUnit, { color: colors.textSecondary }]}>/ 100 pts</Text>
          </View>

          <Text style={[styles.scoreFeedback, { color: colors.textSecondary }]}>
            {todayCalories === 0
              ? t('no_food_logged_yet')
              : isGoalMetToday
              ? `🎉 ${todayCalories} kcal (${targetCalorieGoal} kcal)`
              : `⚠️ ${todayCalories} kcal (${todayCalories - targetCalorieGoal} kcal)`}
          </Text>

          <View style={[styles.pointsPillRow, { backgroundColor: colors.lime }]}>
            <Ionicons name="ribbon" size={16} color="#0F172A" />
            <Text style={styles.pointsPillText}>{t('total_earned_pts').replace('{pts}', String(totalPoints))}</Text>
          </View>
        </Animated.View>

        {/* Streak & Record Audio Celebration */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(500)}
          style={[
            styles.celebrationCard,
            {
              backgroundColor: isDarkMode ? '#1C1812' : '#FFFDF5',
              borderColor: '#F59E0B40',
            },
          ]}
        >
          <View style={styles.celebrationRow}>
            <View style={[styles.celebrationIconBox, { backgroundColor: '#F59E0B20' }]}>
              <Text style={{ fontSize: 24 }}>🏆</Text>
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.celebrationTitle, { color: colors.textPrimary }]}>
                  Celebrazione Streak 🔥
                </Text>
                <View style={styles.streakMilestoneBadge}>
                  <Text style={styles.streakMilestoneText}>{streakDays} Giorni</Text>
                </View>
              </View>
              <Text style={[styles.celebrationDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                {celebrationText
                  ? celebrationText
                  : `Ascolta la voce di ${coachVoice?.name || 'Coach AI'} che celebra il tuo record di costanza!`}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.celebrationPlayBtn,
                { backgroundColor: isPlayingCelebration ? colors.coral : '#F59E0B' },
              ]}
              onPress={handlePlayStreakCelebration}
              disabled={isLoadingCelebration}
              activeOpacity={0.85}
            >
              {isLoadingCelebration ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : isPlayingCelebration ? (
                <Ionicons name="pause" size={18} color="#FFFFFF" />
              ) : (
                <Ionicons name="volume-high" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {celebrationText ? (
            <View style={[styles.celebrationQuoteBox, { backgroundColor: isDarkMode ? '#16120C' : '#FFF9EE' }]}>
              <Text style={[styles.celebrationQuoteText, { color: colors.textPrimary }]}>
                "{celebrationText}"
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Achievements Checklist */}
        <View style={styles.listSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('unlocked_achievements')}</Text>

          {loading ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.lime} />
            </View>
          ) : (
            achievements.map((item, idx) => (
              <Animated.View
                key={item.id}
                entering={FadeInUp.delay(100 + idx * 60).duration(400)}
              >
                <TouchableOpacity
                  style={[
                    styles.rewardCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                    !item.unlocked && styles.rewardCardLocked,
                  ]}
                  onPress={() => {
                    triggerHaptic('light');
                    if (!item.unlocked && item.id === '4') {
                      openPaywall('rewards_pro');
                    } else {
                      Alert.alert(item.title, `${item.desc}\nPoints: +${item.points} pts`);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.rewardIconCircle,
                      { backgroundColor: item.unlocked ? colors.limeGlow : colors.inputBg },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.unlocked ? colors.lime : colors.textMuted}
                    />
                  </View>

                  <View style={styles.rewardInfoGroup}>
                    <Text style={[styles.rewardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.rewardDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                  </View>

                  <View
                    style={[
                      styles.rewardPointsBadge,
                      { backgroundColor: item.unlocked ? colors.lime : colors.inputBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rewardPointsText,
                        { color: item.unlocked ? '#0F172A' : colors.textMuted },
                      ]}
                    >
                      {item.unlocked ? `+${item.points} pts` : t('locked')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      <VoiceFeatureAdModal
        visible={showAdModal}
        featureTitle="Celebrazione Record di Streak"
        featureDescription="Ascolta la celebrazione trionfale ed entusiasta del tuo Coach Vocale per aver raggiunto questo record di costanza!"
        featureIcon="trophy"
        onClose={() => setShowAdModal(false)}
        onUnlocked={() => {
          setShowAdModal(false);
          startCelebrationPlayback();
        }}
        onGoPro={() => openPaywall('streak_celebration_voice')}
      />

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
  scoreHeroCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  scoreBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  streakText: {
    fontSize: 13,
    fontWeight: '900',
  },
  scoreValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  scoreValNum: {
    fontSize: 42,
    fontWeight: '900',
  },
  scoreUnit: {
    fontSize: 15,
    marginLeft: 6,
    fontWeight: '700',
  },
  scoreFeedback: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  pointsPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  pointsPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  listSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  rewardCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  rewardCardLocked: {
    opacity: 0.75,
  },
  rewardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardInfoGroup: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  rewardDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  rewardPointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  rewardPointsText: {
    fontSize: 11,
    fontWeight: '900',
  },
  // Celebration Card Styles
  celebrationCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  celebrationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  streakMilestoneBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  streakMilestoneText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  celebrationDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  celebrationPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  celebrationQuoteBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  celebrationQuoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    fontWeight: '600',
  },
});
