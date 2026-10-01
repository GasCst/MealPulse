import { TouchableOpacity } from '@/components/ui/FeedbackPressable';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useVoiceAction } from '@/hooks/useVoiceAction';
import { useLanguage } from '@/context/LanguageContext';
import { voiceCoachService, DEFAULT_COACH_VOICE } from '@/services/voiceCoachService';
import type { ModelVoiceItem } from '@/components/VoiceSelectorModal';
import { briefingContextKey, morningBriefingFacts, type MorningBriefingSnapshot } from '@/services/briefingContext';
import { VoiceFeatureAdModal } from './VoiceFeatureAdModal';

type MorningBriefingCardProps = MorningBriefingSnapshot;

export const MorningBriefingCard: React.FC<MorningBriefingCardProps> = ({
  targetCalories,
  eatenCalories,
  burnedCalories,
  proteinLeft,
  includeBurnedInBudget,
  dateKey,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();
  const { isPro, openPaywall } = useSubscription();
  const { isPlaying, isLoading, run: runBriefing } = useVoiceAction('briefing');
  const [coachVoice, setCoachVoice] = useState<ModelVoiceItem | null>(null);
  const [briefing, setBriefing] = useState<{ key: string; text: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);

  const waveAnim1 = useRef(new RNAnimated.Value(0.3)).current;
  const waveAnim2 = useRef(new RNAnimated.Value(0.6)).current;
  const waveAnim3 = useRef(new RNAnimated.Value(0.4)).current;
  const waveAnim4 = useRef(new RNAnimated.Value(0.7)).current;

  const snapshot = useMemo(() => ({ dateKey, targetCalories, eatenCalories, burnedCalories, proteinLeft, includeBurnedInBudget }),
    [dateKey, targetCalories, eatenCalories, burnedCalories, proteinLeft, includeBurnedInBudget]);
  const request = useMemo(() => {
    const voice = coachVoice || DEFAULT_COACH_VOICE;
    return { snapshot, voice, language, key: briefingContextKey(snapshot, voice.id, language) };
  }, [snapshot, coachVoice, language]);
  const latestRequest = useRef(request);
  latestRequest.current = request;
  const mounted = useRef(true);
  const previousKey = useRef<string | null>(null);
  const briefingText = briefing?.key === request.key ? briefing.text : '';

  useEffect(() => {
    mounted.current = true;
    const unsubVoice = voiceCoachService.subscribePreferredVoice(setCoachVoice);
    return () => {
      mounted.current = false;
      unsubVoice();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (previousKey.current && previousKey.current !== request.key) {
      // Cancel stale briefing audio without interrupting another voice feature.
      void voiceCoachService.stopAudio('briefing');
    }
    previousKey.current = request.key;
    voiceCoachService.getMorningBriefing(request.snapshot, request.voice, request.language)
      .then(text => {
        if (!cancelled && mounted.current && latestRequest.current.key === request.key) {
          setBriefing({ key: request.key, text });
        }
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [request]);

  // Equalizer wave animation when playing
  useEffect(() => {
    let anim: RNAnimated.CompositeAnimation | null = null;
    if (isPlaying) {
      anim = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.parallel([
            RNAnimated.timing(waveAnim1, { toValue: 1.0, duration: 220, useNativeDriver: true }),
            RNAnimated.timing(waveAnim2, { toValue: 0.3, duration: 250, useNativeDriver: true }),
            RNAnimated.timing(waveAnim3, { toValue: 0.9, duration: 210, useNativeDriver: true }),
            RNAnimated.timing(waveAnim4, { toValue: 0.4, duration: 240, useNativeDriver: true }),
          ]),
          RNAnimated.parallel([
            RNAnimated.timing(waveAnim1, { toValue: 0.3, duration: 220, useNativeDriver: true }),
            RNAnimated.timing(waveAnim2, { toValue: 0.9, duration: 250, useNativeDriver: true }),
            RNAnimated.timing(waveAnim3, { toValue: 0.3, duration: 210, useNativeDriver: true }),
            RNAnimated.timing(waveAnim4, { toValue: 1.0, duration: 240, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
    } else {
      RNAnimated.parallel([
        RNAnimated.timing(waveAnim1, { toValue: 0.3, duration: 150, useNativeDriver: true }),
        RNAnimated.timing(waveAnim2, { toValue: 0.5, duration: 150, useNativeDriver: true }),
        RNAnimated.timing(waveAnim3, { toValue: 0.3, duration: 150, useNativeDriver: true }),
        RNAnimated.timing(waveAnim4, { toValue: 0.4, duration: 150, useNativeDriver: true }),
      ]).start();
    }

    return () => {
      anim?.stop();
    };
  }, [isPlaying, waveAnim1, waveAnim2, waveAnim3, waveAnim4]);

  const startBriefingPlayback = () => runBriefing(async () => {
    try {
      // Read current data after the ad and recheck it after asynchronous preparation.
      while (mounted.current) {
        const current = latestRequest.current;
        const text = await voiceCoachService.getMorningBriefing(current.snapshot, current.voice, current.language);
        if (!mounted.current) return;
        if (latestRequest.current.key !== current.key) continue;
        setBriefing({ key: current.key, text });
        setIsExpanded(true);
        await voiceCoachService.playSpeech(text, current.voice.id, 'briefing', current.language);
        return;
      }
    } catch (e) {
      console.warn('[MorningBriefing] Play error:', e);
    }
  });

  const handleTogglePlay = async () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }

    if (isPlaying) {
      await voiceCoachService.stopAudio();
      return;
    }

    // PRO Check: if non-pro user, trigger ad modal
    if (!isPro) {
      setShowAdModal(true);
      return;
    }

    await startBriefingPlayback();
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[
        styles.card,
        {
          backgroundColor: isDarkMode ? '#131F17' : '#FFFFFF',
          borderColor: isDarkMode ? '#1E3827' : '#E3EFE6',
        },
      ]}
    >
      <View style={styles.contentRow}>
        {/* Coach Avatar Circle */}
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: isDarkMode ? '#1E3827' : '#E8F5EC' },
          ]}
        >
          <Text style={styles.avatarEmoji}>{coachVoice?.emoji || '🤖'}</Text>
          {isPlaying && (
            <View style={[styles.onlineDot, { backgroundColor: colors.lime }]} />
          )}
        </View>

        {/* Text Info */}
        <TouchableOpacity
          style={styles.textColumn}
          sound={isExpanded ? 'close' : 'open'} onPress={() => setIsExpanded((prev) => !prev)}
          activeOpacity={0.8}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Morning AI Briefing
            </Text>
            <View style={styles.coachBadge}>
              <Text style={styles.coachBadgeText}>
                {coachVoice?.name || 'Coach AI'}
              </Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={isExpanded ? 4 : 1}>
            {isLoading ? t('voice_loading_hint') : briefingText
              ? briefingText
              : morningBriefingFacts(snapshot, request.voice.id, language)}
          </Text>
        </TouchableOpacity>

        {/* Play / Pause / Equalizer Button */}
        <TouchableOpacity
          style={[
            styles.playButton,
            { backgroundColor: isPlaying ? colors.coral : colors.lime },
          ]}
          sound={isPlaying ? 'close' : 'voice'} onPress={handleTogglePlay}
          disabled={isLoading}
          accessibilityLabel={t(isLoading ? 'voice_loading' : isPlaying ? 'voice_stop' : 'voice_listen')}
          accessibilityState={{ busy: isLoading, disabled: isLoading }}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#0B1410" />
          ) : isPlaying ? (
            <View style={styles.waveContainer}>
              <RNAnimated.View
                style={[
                  styles.waveBar,
                  {
                    transform: [{ scaleY: waveAnim1 }],
                    backgroundColor: '#FFFFFF',
                  },
                ]}
              />
              <RNAnimated.View
                style={[
                  styles.waveBar,
                  {
                    transform: [{ scaleY: waveAnim2 }],
                    backgroundColor: '#FFFFFF',
                  },
                ]}
              />
              <RNAnimated.View
                style={[
                  styles.waveBar,
                  {
                    transform: [{ scaleY: waveAnim3 }],
                    backgroundColor: '#FFFFFF',
                  },
                ]}
              />
              <RNAnimated.View
                style={[
                  styles.waveBar,
                  {
                    transform: [{ scaleY: waveAnim4 }],
                    backgroundColor: '#FFFFFF',
                  },
                ]}
              />
            </View>
          ) : (
            <Ionicons name="play" size={16} color="#0B1410" style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>
      </View>

      <VoiceFeatureAdModal
        visible={showAdModal}
        featureTitle="Morning AI Nutrition Briefing"
        featureDescription="Ascolta la motivazione e il resoconto nutrizionale personalizzato del tuo Coach AI ogni mattina."
        featureIcon="sparkles"
        onClose={() => setShowAdModal(false)}
        onUnlocked={() => {
          setShowAdModal(false);
          startBriefingPlayback();
        }}
        onGoPro={() => openPaywall('morning_briefing_audio')}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#131F17',
  },
  textColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  coachBadge: {
    backgroundColor: '#FF6B4A15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  coachBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B4A',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
    height: 16,
    width: 18,
  },
  waveBar: {
    width: 2.5,
    height: 16,
    borderRadius: 1.5,
  },
});
