import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useSubscription, UserBiometrics } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { PaywallModal } from '@/components/PaywallModal';
import { SpinWheelModal } from '@/components/SpinWheelModal';
import { CinematicIntro } from '@/components/CinematicIntro';
import { AdBanner } from '@/components/AdBanner';
import { UnitSystem } from '@/services/unitService';

export default function OnboardingScreen() {
  const router = useRouter();
  const {
    isPro,
    setHasSeenSpinWheel,
    setCompletedOnboarding,
    saveBiometrics,
    setUnitSystem,
    unitSystem,
  } = useSubscription();
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { isDarkMode, colors } = useTheme();

  const [stepMode, setStepMode] = useState<'cinematic' | 'greeting' | 'quiz' | 'generating'>('cinematic');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Biometric state & Unit System
  const [preferredUnit, setPreferredUnit] = useState<UnitSystem>(unitSystem || 'metric');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<string>('28');
  const [heightCm, setHeightCm] = useState<string>('175');
  const [weightKg, setWeightKg] = useState<string>('74');
  const [goalWeightKg, setGoalWeightKg] = useState<string>('68');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'intense'>('moderate');
  const [primaryGoal, setPrimaryGoal] = useState<string>('Lose Fat & Weight');
  const [allergies, setAllergies] = useState<string[]>(['None']);
  const [dietPreference, setDietPreference] = useState<string>('Standard Omnivore');

  // Generation animation & Modal state
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationText, setGenerationText] = useState('Calculating BMR & TDEE...');
  const [computedKcal, setComputedKcal] = useState(1920);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);

  // Reanimated values for pulsing effects
  const pulseScale = useSharedValue(1);
  const radarRotation = useSharedValue(0);
  const glowRingScale = useSharedValue(1);
  const glowRingOpacity = useSharedValue(0.6);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    radarRotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
    glowRingScale.value = withRepeat(
      withTiming(1.35, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
    glowRingOpacity.value = withRepeat(
      withTiming(0.1, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedRadarStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${radarRotation.value}deg` }],
  }));

  const animatedGlowRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowRingScale.value }],
    opacity: glowRingOpacity.value,
  }));

  const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // ignore
    }
  };

  const toggleAllergy = (item: string) => {
    triggerHaptic('light');
    if (item === 'None') {
      setAllergies(['None']);
      return;
    }
    setAllergies((prev) => {
      const filtered = prev.filter((a) => a !== 'None');
      if (filtered.includes(item)) {
        const next = filtered.filter((a) => a !== item);
        return next.length === 0 ? ['None'] : next;
      }
      return [...filtered, item];
    });
  };

  const calculateBiometrics = (): UserBiometrics => {
    const ageNum = parseInt(age, 10) || 28;
    const heightNum = parseInt(heightCm, 10) || 175;

    let rawWeight = parseFloat(weightKg.replace(',', '.')) || 74;
    let rawGoalWeight = parseFloat(goalWeightKg.replace(',', '.')) || 68;

    if (preferredUnit === 'imperial') {
      rawWeight = rawWeight * 0.45359237;
      rawGoalWeight = rawGoalWeight * 0.45359237;
    }

    const weightNum = Math.round(rawWeight * 10) / 10;
    const goalWeightNum = Math.round(rawGoalWeight * 10) / 10;

    let bmr = 0;
    if (gender === 'male') {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
    } else {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;
    }

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      intense: 1.725,
    };

    let tdee = Math.round(bmr * (activityMultipliers[activityLevel] || 1.375));

    if (primaryGoal.includes('Lose')) {
      tdee = Math.max(1200, tdee - 450);
    } else if (primaryGoal.includes('Muscle') || primaryGoal.includes('Gain')) {
      tdee = tdee + 350;
    }

    const targetProtein = Math.round((tdee * 0.30) / 4);
    const targetCarbs = Math.round((tdee * 0.40) / 4);
    const targetFat = Math.round((tdee * 0.30) / 9);

    return {
      gender,
      age: ageNum,
      heightCm: heightNum,
      weightKg: weightNum,
      goalWeightKg: goalWeightNum,
      activityLevel,
      primaryGoal,
      allergies,
      dietPreference,
      bmr: Math.round(bmr),
      tdee,
      targetProtein,
      targetCarbs,
      targetFat,
      unitSystem: preferredUnit,
    };
  };

  const handleNextStep = () => {
    triggerHaptic('medium');
    if (currentStepIndex < 6) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      runGenerationAnimation();
    }
  };

  const runGenerationAnimation = async () => {
    triggerHaptic('success');
    const bio = calculateBiometrics();
    setComputedKcal(bio.tdee);
    setStepMode('generating');

    setGenerationProgress(20);
    setGenerationText('Applying Mifflin-St Jeor BMR Formula...');

    await new Promise((r) => setTimeout(r, 650));
    triggerHaptic('light');
    setGenerationProgress(50);
    setGenerationText(`Factoring Activity (${activityLevel.toUpperCase()}) & TDEE...`);

    await new Promise((r) => setTimeout(r, 700));
    triggerHaptic('light');
    setGenerationProgress(80);
    setGenerationText('Configuring Macro Split (30% Protein / 40% Carbs / 30% Fat)...');

    await new Promise((r) => setTimeout(r, 650));
    triggerHaptic('success');
    setGenerationProgress(100);
    setGenerationText(`Plan Ready! Daily Target: ${bio.tdee} kcal/day`);

    await setUnitSystem(preferredUnit);
    await saveBiometrics(bio);
    await setHasSeenSpinWheel(false);

    await new Promise((r) => setTimeout(r, 600));
    await setCompletedOnboarding(true);
    setShowPaywallModal(true);
  };

  const handlePaywallClose = () => {
    setShowPaywallModal(false);
    if (!isPro) {
      setHasSeenSpinWheel(true);
      setTimeout(() => {
        setShowSpinWheel(true);
      }, 250);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSpinWheelClose = () => {
    setShowSpinWheel(false);
    router.replace('/(tabs)');
  };

  if (stepMode === 'cinematic') {
    return <CinematicIntro onComplete={() => setStepMode('greeting')} />;
  }

  if (stepMode === 'greeting') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.greetingContainer}>
          <Animated.View style={[styles.mascotCircleWrapper, animatedPulseStyle]}>
            <View style={[styles.glowRing, { borderColor: colors.lime }]} />
            <View style={[styles.mascotCircle, { backgroundColor: isDarkMode ? '#1A231C' : '#F7FEE7', borderColor: colors.lime }]}>
              <Text style={{ fontSize: 44 }}>⚡</Text>
              <View style={[styles.mascotBadge, { backgroundColor: '#0F131C' }]}>
                <Text style={[styles.mascotBadgeText, { color: colors.lime }]}>BIO-PULSE AI</Text>
              </View>
            </View>
          </Animated.View>

          <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>{t('onboarding_title')}</Text>
          <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
            {"Let's calculate your exact Basal Metabolic Rate (BMR) & daily calorie goal using scientific biometrics."}
          </Text>

          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={[styles.benefitsBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.benefitRow}>
              <View style={[styles.benefitIconCircle, { backgroundColor: colors.limeGlow }]}>
                <Ionicons name="calculator" size={18} color={colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitText, { color: colors.textPrimary }]}>Mifflin-St Jeor Formula</Text>
                <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>Scientific precision tailored to your metabolism</Text>
              </View>
            </View>
            <View style={styles.benefitRow}>
              <View style={[styles.benefitIconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                <Ionicons name="nutrition" size={18} color={colors.sky} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitText, { color: colors.textPrimary }]}>Targeted Macro & Micronutrients</Text>
                <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>Optimal protein, carbs, and healthy fats distribution</Text>
              </View>
            </View>
            <View style={styles.benefitRow}>
              <View style={[styles.benefitIconCircle, { backgroundColor: 'rgba(255, 107, 74, 0.2)' }]}>
                <Ionicons name="camera" size={18} color={colors.coral} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitText, { color: colors.textPrimary }]}>Instant AI Vision Scanning</Text>
                <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>Snap any dish for instant calorie estimation</Text>
              </View>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={[styles.startQuizBtn, { backgroundColor: colors.lime }]}
            onPress={() => {
              triggerHaptic('medium');
              setStepMode('quiz');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.startQuizBtnText}>Start Calibration 🚀</Text>
            <Ionicons name="arrow-forward" size={18} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ width: '100%', marginTop: 14 }}>
            <AdBanner location="onboarding_greeting" />
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (stepMode === 'generating') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={styles.generatingContainer}>
          <Animated.View style={styles.radarWrapper}>
            <Animated.View style={[styles.pulseRadarOuter, { borderColor: colors.lime }, animatedGlowRingStyle]} />
            <Animated.View style={[styles.radarCircle, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}>
              <Animated.View style={[styles.radarSweeper, { backgroundColor: colors.limeGlow }, animatedRadarStyle]}>
                <View style={[styles.radarBeam, { backgroundColor: colors.lime }]} />
              </Animated.View>
              <Ionicons name="fitness" size={42} color={colors.lime} />
            </Animated.View>
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(400)} style={[styles.generatingTitle, { color: colors.textPrimary }]}>
            Generating Biometric Plan
          </Animated.Text>
          <Text style={[styles.generatingSub, { color: colors.textSecondary }]}>{generationText}</Text>

          <View style={[styles.progressBarBg, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: `${generationProgress}%`,
                  backgroundColor: colors.lime,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressPercent, { color: colors.lime }]}>{generationProgress}%</Text>

          {generationProgress === 100 && (
            <Animated.View entering={ZoomIn.duration(500)} style={[styles.targetPreviewCard, { backgroundColor: colors.cardBg, borderColor: colors.lime }]}>
              <Text style={[styles.targetPreviewLabel, { color: colors.textSecondary }]}>CALIBRATED DAILY TARGET</Text>
              <Text style={[styles.targetPreviewVal, { color: colors.lime }]}>{computedKcal} <Text style={{ fontSize: 16, color: colors.textSecondary }}>kcal / day</Text></Text>
            </Animated.View>
          )}

          <View style={{ width: '100%', marginTop: 24 }}>
            <AdBanner location="onboarding_generating" />
          </View>
        </View>

        <PaywallModal visible={showPaywallModal} onClose={handlePaywallClose} />
        <SpinWheelModal visible={showSpinWheel} onClose={handleSpinWheelClose} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Header progress bar */}
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            if (currentStepIndex > 0) setCurrentStepIndex(currentStepIndex - 1);
            else setStepMode('greeting');
          }}
          style={[styles.backBtn, { backgroundColor: colors.inputBg }]}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.stepIndicatorContainer}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  { backgroundColor: colors.cardBorder },
                  isDone && { backgroundColor: colors.lime, width: 8 },
                  isActive && { backgroundColor: colors.lime, width: 22 },
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.stepCounterText, { color: colors.textSecondary }]}>{currentStepIndex + 1}/7</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Step 0: Language Selection */}
        {currentStepIndex === 0 && (
          <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(200)} style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.badgeRow}>
              <Text style={[styles.stepBadge, { backgroundColor: colors.limeGlow, color: colors.lime }]}>STEP 1 OF 7</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>🌍 Global Localization</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('select_language')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{t('choose_app_language')}</Text>

            <View style={{ gap: 10, marginTop: 10 }}>
              {supportedLanguages.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.selectOptionCard,
                      { backgroundColor: colors.inputBg, borderColor: isSelected ? colors.lime : colors.cardBorder },
                      isSelected && { borderWidth: 2, backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1' },
                    ]}
                    onPress={() => {
                      triggerHaptic('light');
                      setLanguage(lang.code);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 28 }}>{lang.flag}</Text>
                      <View>
                        <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{lang.nativeName}</Text>
                        <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{lang.name}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.lime} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Step 1: Sex & Age */}
        {currentStepIndex === 1 && (
          <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(200)} style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.badgeRow}>
              <Text style={[styles.stepBadge, { backgroundColor: colors.limeGlow, color: colors.lime }]}>STEP 2 OF 7</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>🧬 Biological Basal Math</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_sex')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Biological sex and age directly calibrate your Basal Metabolic Rate (BMR).</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Biological Sex</Text>
            <View style={styles.rowTwo}>
              <TouchableOpacity
                style={[
                  styles.genderCard,
                  { backgroundColor: colors.inputBg, borderColor: gender === 'male' ? colors.lime : colors.cardBorder },
                  gender === 'male' && { borderWidth: 2, backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1' },
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setGender('male');
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 34 }}>👨</Text>
                <Text style={[styles.genderText, { color: colors.textPrimary }, gender === 'male' && { color: colors.lime, fontWeight: '900' }]}>{t('male')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderCard,
                  { backgroundColor: colors.inputBg, borderColor: gender === 'female' ? colors.lime : colors.cardBorder },
                  gender === 'female' && { borderWidth: 2, backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1' },
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setGender('female');
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 34 }}>👩</Text>
                <Text style={[styles.genderText, { color: colors.textPrimary }, gender === 'female' && { color: colors.lime, fontWeight: '900' }]}>{t('female')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 20 }]}>{t('age')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 28"
              placeholderTextColor={colors.textMuted}
            />
          </Animated.View>
        )}

        {/* Step 2: Height & Current Weight */}
        {currentStepIndex === 2 && (
          <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(200)} style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.badgeRow}>
              <Text style={[styles.stepBadge, { backgroundColor: colors.limeGlow, color: colors.lime }]}>STEP 3 OF 7</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>⚖️ Body Dimensions</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_body')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Used to calculate your daily resting energy expenditure.</Text>

            {/* Unit Preference Selector */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('unit_system') || 'Unit System'}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                style={[
                  styles.unitPillBtn,
                  {
                    borderColor: preferredUnit === 'metric' ? colors.lime : colors.cardBorder,
                    backgroundColor: preferredUnit === 'metric' ? (isDarkMode ? '#1E281C' : '#F4FBF1') : colors.inputBg,
                  },
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  if (preferredUnit !== 'metric') {
                    setPreferredUnit('metric');
                    setWeightKg('74');
                    setGoalWeightKg('68');
                  }
                }}
              >
                <Text style={[styles.unitPillText, { color: preferredUnit === 'metric' ? colors.lime : colors.textPrimary }]}>
                  🇪🇺 Metric (cm / kg)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.unitPillBtn,
                  {
                    borderColor: preferredUnit === 'imperial' ? colors.lime : colors.cardBorder,
                    backgroundColor: preferredUnit === 'imperial' ? (isDarkMode ? '#1E281C' : '#F4FBF1') : colors.inputBg,
                  },
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  if (preferredUnit !== 'imperial') {
                    setPreferredUnit('imperial');
                    setWeightKg('163');
                    setGoalWeightKg('150');
                  }
                }}
              >
                <Text style={[styles.unitPillText, { color: preferredUnit === 'imperial' ? colors.lime : colors.textPrimary }]}>
                  🇺🇸 Imperial (cm / lbs)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t('height')} (cm)
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="number-pad"
              value={heightCm}
              onChangeText={setHeightCm}
              placeholder="e.g. 175"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              {t('weight')} ({preferredUnit === 'imperial' ? 'lbs' : 'kg'})
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="decimal-pad"
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder={preferredUnit === 'imperial' ? 'e.g. 163' : 'e.g. 74'}
              placeholderTextColor={colors.textMuted}
            />
          </Animated.View>
        )}

        {/* Step 3: Goal Weight & Primary Goal */}
        {currentStepIndex === 3 && (
          <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(200)} style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.badgeRow}>
              <Text style={[styles.stepBadge, { backgroundColor: colors.limeGlow, color: colors.lime }]}>STEP 4 OF 7</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>🎯 Target Ambition</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_goal')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>What is your primary fitness & body target?</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t('goal_weight')} ({preferredUnit === 'imperial' ? 'lbs' : 'kg'})
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="decimal-pad"
              value={goalWeightKg}
              onChangeText={setGoalWeightKg}
              placeholder={preferredUnit === 'imperial' ? 'e.g. 150' : 'e.g. 68'}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>Main Goal</Text>
            {[
              { id: 'g1', label: t('goal_fat_loss'), desc: '-450 kcal deficit/day for healthy fat loss' },
              { id: 'g2', label: t('goal_maintain'), desc: 'Maintain body composition with balanced energy' },
              { id: 'g3', label: t('goal_muscle'), desc: '+350 kcal surplus/day with high protein' },
            ].map((item) => {
              const isSelected = primaryGoal === item.label;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.selectOptionCard,
                    { backgroundColor: colors.inputBg, borderColor: isSelected ? colors.lime : colors.cardBorder },
                    isSelected && { borderWidth: 2, backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1' },
                  ]}
                  onPress={() => {
                    triggerHaptic('light');
                    setPrimaryGoal(item.label);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{item.label}</Text>
                    <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{item.desc}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.lime} />}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* Step 4: Activity Level */}
        {currentStepIndex === 4 && (
          <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(200)} style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.badgeRow}>
              <Text style={[styles.stepBadge, { backgroundColor: colors.limeGlow, color: colors.lime }]}>STEP 5 OF 7</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>🏃 Weekly Movement</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_activity')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>How active are you during a typical week?</Text>

            {[
              { id: 'sedentary', label: t('act_sedentary'), desc: 'Little to no weekly exercise (Desk job)' },
              { id: 'light', label: t('act_light'), desc: '1–3 light workouts or walking daily' },
              { id: 'moderate', label: t('act_moderate'), desc: '3–5 gym or cardio sessions per week' },
              { id: 'intense', label: t('act_intense'), desc: '6+ heavy training sessions / athlete' },
            ].map((item) => {
              const isSelected = activityLevel === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.selectOptionCard,
                    { backgroundColor: colors.inputBg, borderColor: isSelected ? colors.lime : colors.cardBorder },
                    isSelected && { borderWidth: 2, backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1' },
                  ]}
                  onPress={() => {
                    triggerHaptic('light');
                    setActivityLevel(item.id as any);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{item.label}</Text>
                    <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{item.desc}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.lime} />}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* Step 5: Allergies & Intolerances */}
        {currentStepIndex === 5 && (
          <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(200)} style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.badgeRow}>
              <Text style={[styles.stepBadge, { backgroundColor: colors.limeGlow, color: colors.lime }]}>STEP 6 OF 7</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>🛡️ Health & Filters</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_allergies')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Select all food items or ingredients you avoid.</Text>

            <View style={styles.chipGrid}>
              {[
                'None',
                'Gluten-free',
                'Lactose-free',
                'Nuts & Peanuts',
                'Shellfish',
                'Eggs',
                'Soy',
              ].map((item) => {
                const isSelected = allergies.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.inputBg, borderColor: isSelected ? colors.lime : colors.cardBorder },
                      isSelected && { borderWidth: 1.5, backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1' },
                    ]}
                    onPress={() => toggleAllergy(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, { color: colors.textPrimary }, isSelected && { color: colors.lime, fontWeight: '800' }]}>
                      {isSelected ? '✓ ' : ''}{item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Step 6: Dietary Preference */}
        {currentStepIndex === 6 && (
          <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(200)} style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.badgeRow}>
              <Text style={[styles.stepBadge, { backgroundColor: colors.limeGlow, color: colors.lime }]}>STEP 7 OF 7</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>🥗 Nutrition Style</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_diet')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Choose your preferred nutritional regime.</Text>

            {[
              { id: 'd1', label: t('diet_standard'), desc: 'Flexible balance of meat, fish, carbs & veggies' },
              { id: 'd2', label: t('diet_vegetarian'), desc: 'Plant-based with eggs & dairy' },
              { id: 'd3', label: t('diet_vegan'), desc: '100% plant-based nutrition' },
              { id: 'd4', label: t('diet_keto'), desc: 'High fat, moderate protein, minimal carbs' },
            ].map((item) => {
              const isSelected = dietPreference === item.label;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.selectOptionCard,
                    { backgroundColor: colors.inputBg, borderColor: isSelected ? colors.lime : colors.cardBorder },
                    isSelected && { borderWidth: 2, backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1' },
                  ]}
                  onPress={() => {
                    triggerHaptic('light');
                    setDietPreference(item.label);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{item.label}</Text>
                    <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{item.desc}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.lime} />}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        <View style={{ marginTop: 16, marginBottom: 8, width: '100%' }}>
          <AdBanner location={`onboarding_step_${currentStepIndex + 1}`} />
        </View>
      </ScrollView>

      {/* Footer next button */}
      <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.lime }]} onPress={handleNextStep} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>
            {currentStepIndex === 6 ? t('calculate_my_plan') : t('next')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <PaywallModal visible={showPaywallModal} onClose={handlePaywallClose} />
      <SpinWheelModal visible={showSpinWheel} onClose={handleSpinWheelClose} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  greetingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  mascotCircleWrapper: {
    position: 'relative',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    opacity: 0.35,
  },
  mascotCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mascotBadge: {
    position: 'absolute',
    bottom: -10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  mascotBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  greetingSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  benefitsBox: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '800',
  },
  benefitSub: {
    fontSize: 12,
    marginTop: 2,
  },
  startQuizBtn: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  startQuizBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  radarWrapper: {
    position: 'relative',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  pulseRadarOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  radarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  radarSweeper: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  radarBeam: {
    width: 2,
    height: 50,
  },
  generatingTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  generatingSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  targetPreviewCard: {
    width: '100%',
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  targetPreviewLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  targetPreviewVal: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepCounterText: {
    fontSize: 13,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  stepCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepBadge: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  selectOptionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '800',
  },
  textInput: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
  },
  unitPillBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  unitPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  nextBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
});
