import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription, UserBiometrics } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { PaywallModal } from '@/components/PaywallModal';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setCompletedOnboarding, saveBiometrics } = useSubscription();
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { isDarkMode, colors } = useTheme();

  const [stepMode, setStepMode] = useState<'greeting' | 'quiz' | 'generating'>('greeting');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Biometric state
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<string>('28');
  const [heightCm, setHeightCm] = useState<string>('175');
  const [weightKg, setWeightKg] = useState<string>('74');
  const [goalWeightKg, setGoalWeightKg] = useState<string>('68');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'intense'>('moderate');
  const [primaryGoal, setPrimaryGoal] = useState<string>('Lose Fat & Weight');
  const [allergies, setAllergies] = useState<string[]>(['None']);
  const [dietPreference, setDietPreference] = useState<string>('Standard Omnivore');

  // Generation animation state
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationText, setGenerationText] = useState('Calculating BMR & TDEE...');
  const [computedKcal, setComputedKcal] = useState(1920);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  const toggleAllergy = (item: string) => {
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
    const weightNum = parseFloat(weightKg) || 74;
    const goalWeightNum = parseFloat(goalWeightKg) || 68;

    // Mifflin-St Jeor Formula
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
    };
  };

  const handleNextStep = () => {
    if (currentStepIndex < 6) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      runGenerationAnimation();
    }
  };

  const runGenerationAnimation = async () => {
    const bio = calculateBiometrics();
    setComputedKcal(bio.tdee);
    setStepMode('generating');

    setGenerationProgress(20);
    setGenerationText('Applying Mifflin-St Jeor BMR Formula...');

    await new Promise((r) => setTimeout(r, 700));
    setGenerationProgress(50);
    setGenerationText(`Factoring Activity (${activityLevel.toUpperCase()}) & TDEE...`);

    await new Promise((r) => setTimeout(r, 800));
    setGenerationProgress(80);
    setGenerationText('Configuring Macro Split (30% Protein / 40% Carbs / 30% Fat)...');

    await new Promise((r) => setTimeout(r, 700));
    setGenerationProgress(100);
    setGenerationText(`Plan Ready! Daily Target: ${bio.tdee} kcal/day`);

    await saveBiometrics(bio);

    await new Promise((r) => setTimeout(r, 600));
    await setCompletedOnboarding(true);
    setShowPaywallModal(true);
  };

  const handlePaywallClose = () => {
    setShowPaywallModal(false);
    router.replace('/(tabs)');
  };

  if (stepMode === 'greeting') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={styles.greetingContainer}>
          <View style={styles.mascotCircle}>
            <Text style={{ fontSize: 44 }}>👾</Text>
            <View style={styles.mascotBadge}>
              <Text style={styles.mascotBadgeText}>MEALMONSTER AI</Text>
            </View>
          </View>

          <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>{t('onboarding_title')}</Text>
          <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
            Let's calculate your exact Basal Metabolic Rate (BMR) & daily calorie goal using scientific biometrics.
          </Text>

          <View style={[styles.benefitsBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color="#84CC16" />
              <Text style={[styles.benefitText, { color: colors.textPrimary }]}>Scientific Mifflin-St Jeor Calorie Math</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color="#84CC16" />
              <Text style={[styles.benefitText, { color: colors.textPrimary }]}>Allergy & Dietary Filter Customization</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color="#84CC16" />
              <Text style={[styles.benefitText, { color: colors.textPrimary }]}>Instant AI Camera Photo Recognition</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startQuizBtn}
            onPress={() => setStepMode('quiz')}
            activeOpacity={0.85}
          >
            <Text style={styles.startQuizBtnText}>Start Quiz 🚀</Text>
            <Ionicons name="arrow-forward" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (stepMode === 'generating') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={styles.generatingContainer}>
          <View style={styles.spinnerCircle}>
            <ActivityIndicator size="large" color="#84CC16" />
          </View>
          <Text style={[styles.generatingTitle, { color: colors.textPrimary }]}>Generating Biometric Plan</Text>
          <Text style={[styles.generatingSub, { color: colors.textSecondary }]}>{generationText}</Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${generationProgress}%` }]} />
          </View>
          <Text style={[styles.progressPercent, { color: colors.textPrimary }]}>{generationProgress}%</Text>
        </View>

        <PaywallModal visible={showPaywallModal} onClose={handlePaywallClose} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Header progress bar */}
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity
          onPress={() => currentStepIndex > 0 ? setCurrentStepIndex(currentStepIndex - 1) : setStepMode('greeting')}
          style={[styles.backBtn, { backgroundColor: colors.inputBg }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.stepIndicatorContainer}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                { backgroundColor: colors.cardBorder },
                i <= currentStepIndex && styles.stepDotActive,
              ]}
            />
          ))}
        </View>
        <Text style={[styles.stepCounterText, { color: colors.textSecondary }]}>{currentStepIndex + 1}/7</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Step 0: Language Selection */}
        {currentStepIndex === 0 && (
          <View style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={styles.stepBadge}>STEP 1 OF 7</Text>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('select_language')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{t('choose_app_language')}</Text>

            <View style={{ gap: 10, marginTop: 10 }}>
              {supportedLanguages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.selectOptionCard,
                    { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                    language === lang.code && styles.selectedOptionCard,
                  ]}
                  onPress={() => setLanguage(lang.code)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 28 }}>{lang.flag}</Text>
                    <View>
                      <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{lang.nativeName}</Text>
                      <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{lang.name}</Text>
                    </View>
                  </View>
                  {language === lang.code && (
                    <Ionicons name="checkmark-circle" size={22} color="#84CC16" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 1: Sex & Age */}
        {currentStepIndex === 1 && (
          <View style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={styles.stepBadge}>STEP 2 OF 7</Text>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_sex')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Biological sex and age directly impact your Basal Metabolic Rate (BMR).</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Biological Sex</Text>
            <View style={styles.rowTwo}>
              <TouchableOpacity
                style={[styles.genderCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, gender === 'male' && styles.selectedGenderCard]}
                onPress={() => setGender('male')}
              >
                <Text style={{ fontSize: 32 }}>👨</Text>
                <Text style={[styles.genderText, { color: colors.textPrimary }, gender === 'male' && styles.selectedGenderText]}>{t('male')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.genderCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, gender === 'female' && styles.selectedGenderCard]}
                onPress={() => setGender('female')}
              >
                <Text style={{ fontSize: 32 }}>👩</Text>
                <Text style={[styles.genderText, { color: colors.textPrimary }, gender === 'female' && styles.selectedGenderText]}>{t('female')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 20 }]}>{t('age')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 28"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}

        {/* Step 2: Height & Current Weight */}
        {currentStepIndex === 2 && (
          <View style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={styles.stepBadge}>STEP 3 OF 7</Text>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_body')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Used to calculate your daily energy expenditure.</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('height')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="number-pad"
              value={heightCm}
              onChangeText={setHeightCm}
              placeholder="e.g. 175"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>{t('weight')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="decimal-pad"
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="e.g. 74"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}

        {/* Step 3: Goal Weight & Primary Goal */}
        {currentStepIndex === 3 && (
          <View style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={styles.stepBadge}>STEP 4 OF 7</Text>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_goal')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>What is your primary fitness & body target?</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('goal_weight')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="decimal-pad"
              value={goalWeightKg}
              onChangeText={setGoalWeightKg}
              placeholder="e.g. 68"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>Main Goal</Text>
            {[
              { id: 'g1', label: t('goal_fat_loss'), desc: '-450 kcal deficit/day for rapid fat loss' },
              { id: 'g2', label: t('goal_maintain'), desc: 'Balanced energy expenditure' },
              { id: 'g3', label: t('goal_muscle'), desc: '+350 kcal surplus/day with high protein' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.selectOptionCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, primaryGoal === item.label && styles.selectedOptionCard]}
                onPress={() => setPrimaryGoal(item.label)}
              >
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{item.label}</Text>
                <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 4: Activity Level */}
        {currentStepIndex === 4 && (
          <View style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={styles.stepBadge}>STEP 5 OF 7</Text>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_activity')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>How active are you during a typical week?</Text>

            {[
              { id: 'sedentary', label: t('act_sedentary'), desc: 'Little to no weekly exercise' },
              { id: 'light', label: t('act_light'), desc: '1–3 light workouts or walking' },
              { id: 'moderate', label: t('act_moderate'), desc: '3–5 gym sessions per week' },
              { id: 'intense', label: t('act_intense'), desc: '6+ heavy training sessions' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.selectOptionCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, activityLevel === item.id && styles.selectedOptionCard]}
                onPress={() => setActivityLevel(item.id as any)}
              >
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{item.label}</Text>
                <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 5: Allergies & Intolerances */}
        {currentStepIndex === 5 && (
          <View style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={styles.stepBadge}>STEP 6 OF 7</Text>
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
                    style={[styles.chip, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, isSelected && styles.selectedChip]}
                    onPress={() => toggleAllergy(item)}
                  >
                    <Text style={[styles.chipText, { color: colors.textPrimary }, isSelected && styles.selectedChipText]}>
                      {isSelected ? '✓ ' : ''}{item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 6: Dietary Preference */}
        {currentStepIndex === 6 && (
          <View style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={styles.stepBadge}>STEP 7 OF 7</Text>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{t('step_diet')}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Choose your preferred nutritional style.</Text>

            {[
              { id: 'd1', label: t('diet_standard'), desc: 'Flexible balance of meat, fish, carbs & veggies' },
              { id: 'd2', label: t('diet_vegetarian'), desc: 'Plant-based with eggs & dairy' },
              { id: 'd3', label: t('diet_vegan'), desc: '100% plant-based nutrition' },
              { id: 'd4', label: t('diet_keto'), desc: 'High fat, moderate protein, minimal carbs' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.selectOptionCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, dietPreference === item.label && styles.selectedOptionCard]}
                onPress={() => setDietPreference(item.label)}
              >
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{item.label}</Text>
                <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer next button */}
      <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>
            {currentStepIndex === 6 ? t('calculate_my_plan') : t('next')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <PaywallModal visible={showPaywallModal} onClose={handlePaywallClose} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  greetingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  mascotCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F7FEE7',
    borderWidth: 3,
    borderColor: '#BEF264',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  mascotBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  mascotBadgeText: {
    color: '#BEF264',
    fontSize: 9,
    fontWeight: '900',
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  greetingSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  benefitsBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 28,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  startQuizBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  startQuizBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  stepDot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  stepDotActive: {
    backgroundColor: '#84CC16',
  },
  stepCounterText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#84CC16',
    letterSpacing: 1,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  selectedGenderCard: {
    borderColor: '#84CC16',
    backgroundColor: '#F7FEE7',
  },
  genderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  selectedGenderText: {
    color: '#0F172A',
  },
  selectOptionCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  selectedOptionCard: {
    borderColor: '#84CC16',
    backgroundColor: '#F7FEE7',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: '#64748B',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedChip: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  selectedChipText: {
    color: '#BEF264',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  nextBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#F8FAFC',
  },
  spinnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F7FEE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  generatingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  generatingSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 30,
    height: 40,
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#84CC16',
    borderRadius: 5,
  },
  progressPercent: {
    color: '#84CC16',
    fontSize: 14,
    fontWeight: '800',
  },
});
