import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';
import { PaywallModal } from '@/components/PaywallModal';

const QUIZ_STEPS = [
  {
    id: 1,
    title: 'What is your primary health & body goal?',
    subtitle: 'Pulse Monster will calibrate your optimal daily calorie & macro targets.',
    options: [
      { id: 'g_lose', label: '🔥 Weight Loss & Fat Burn', desc: 'Target: 1,600 kcal/day with high protein retention', kcal: 1600 },
      { id: 'g_muscle', label: '💪 Build Lean Muscle Mass', desc: 'Target: 2,500 kcal/day with protein surplus', kcal: 2500 },
      { id: 'g_maintain', label: '⚖️ Maintain Current Weight', desc: 'Target: 1,920 kcal/day balanced energy', kcal: 1920 },
      { id: 'g_energy', label: '⚡ Boost Daily Vitality & Energy', desc: 'Target: 2,200 kcal/day clean nutrition', kcal: 2200 },
    ],
  },
  {
    id: 2,
    title: 'Select your preferred daily calorie goal:',
    subtitle: 'This will customize your circular Home progress gauge.',
    options: [
      { id: 'cal_1600', label: '⚡ 1,600 kcal / day', desc: 'Accelerated Fat Loss', kcal: 1600 },
      { id: 'cal_1920', label: '🥑 1,920 kcal / day', desc: 'Standard Balanced Fit Target', kcal: 1920 },
      { id: 'cal_2200', label: '🏃 2,200 kcal / day', desc: 'Active Energy Maintenance', kcal: 2200 },
      { id: 'cal_2500', label: '🏋️ 2,500 kcal / day', desc: 'Muscle Growth & Performance', kcal: 2500 },
    ],
  },
  {
    id: 3,
    title: 'What is your current activity level?',
    subtitle: 'Helps fine-tune your Total Daily Energy Expenditure (TDEE).',
    options: [
      { id: 'act_sedentary', label: '🪑 Sedentary / Office', desc: 'Little or no daily exercise' },
      { id: 'act_light', label: '🚶 Lightly Active', desc: '1–3 light workouts per week' },
      { id: 'act_moderate', label: '🏋️ Moderately Active', desc: '3–5 gym sessions per week' },
      { id: 'act_intense', label: '🔥 Athlete / Intense', desc: '6+ heavy training sessions per week' },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { setCompletedOnboarding, setTargetCalories, setPrimaryGoal } = useSubscription();

  const [stepMode, setStepMode] = useState<'greeting' | 'quiz' | 'generating'>('greeting');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationText, setGenerationText] = useState('Calculating BMR & TDEE...');
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  const currentStep = QUIZ_STEPS[currentStepIndex];

  const handleSelectOption = (option: any) => {
    setSelectedAnswers((prev) => ({ ...prev, [currentStepIndex]: option }));
  };

  const handleNext = () => {
    if (!selectedAnswers[currentStepIndex]) return;

    if (currentStepIndex < QUIZ_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      runGenerationAnimation();
    }
  };

  const runGenerationAnimation = async () => {
    setStepMode('generating');
    setGenerationProgress(25);
    setGenerationText('Calculating Basal Metabolic Rate (BMR)...');

    const chosenKcal = selectedAnswers[1]?.kcal || selectedAnswers[0]?.kcal || 1920;
    const chosenGoal = selectedAnswers[0]?.label || 'Lose Weight';

    await new Promise((r) => setTimeout(r, 700));
    setGenerationProgress(60);
    setGenerationText('Optimizing Protein, Carb & Fat split...');

    await new Promise((r) => setTimeout(r, 800));
    setGenerationProgress(85);
    setGenerationText('Calibrating AI Camera Visual Recognition Model...');

    await new Promise((r) => setTimeout(r, 700));
    setGenerationProgress(100);
    setGenerationText(`Plan Ready! Calorie Target: ${chosenKcal} kcal/day`);

    await setTargetCalories(chosenKcal);
    await setPrimaryGoal(chosenGoal);

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.greetingContainer}>
          <View style={styles.fireworksBox}>
            <Text style={{ fontSize: 32 }}>🎉 🎆 🎉</Text>
          </View>

          {/* Pulse Monster Mascot */}
          <View style={styles.mascotCircle}>
            <Text style={{ fontSize: 48 }}>👾</Text>
            <View style={styles.mascotBadge}>
              <Text style={styles.mascotBadgeText}>PULSE MONSTER AI</Text>
            </View>
          </View>

          <Text style={styles.greetingTitle}>Welcome to MealPulse AI!</Text>
          <Text style={styles.greetingSub}>
            Meet Pulse Monster, your friendly AI nutrition coach! Let's build your personalized macro & calorie plan in 60 seconds.
          </Text>

          <TouchableOpacity
            style={styles.startQuizBtn}
            onPress={() => setStepMode('quiz')}
            activeOpacity={0.85}
          >
            <Text style={styles.startQuizBtnText}>Start Personalization 🚀</Text>
            <Ionicons name="arrow-forward" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (stepMode === 'generating') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.generatingContainer}>
          <View style={styles.spinnerCircle}>
            <ActivityIndicator size="large" color="#84CC16" />
          </View>
          <Text style={styles.generatingTitle}>Generating AI Macro Plan</Text>
          <Text style={styles.generatingSub}>{generationText}</Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${generationProgress}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{generationProgress}%</Text>
        </View>

        <PaywallModal visible={showPaywallModal} onClose={handlePaywallClose} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.stepIndicatorContainer}>
          {QUIZ_STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                i <= currentStepIndex && styles.stepDotActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepCounterText}>
          Step {currentStepIndex + 1} of {QUIZ_STEPS.length}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.questionHeaderRow}>
          <Text style={{ fontSize: 24 }}>👾</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.questionTitle}>{currentStep.title}</Text>
            <Text style={styles.questionSub}>{currentStep.subtitle}</Text>
          </View>
        </View>

        <View style={styles.optionsList}>
          {currentStep.options.map((option) => {
            const isSelected = selectedAnswers[currentStepIndex]?.id === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, isSelected && styles.selectedOptionCard]}
                onPress={() => handleSelectOption(option)}
                activeOpacity={0.8}
              >
                <View style={styles.optionRadio}>
                  {isSelected && <View style={styles.optionRadioInner} />}
                </View>
                <View style={styles.optionTextGroup}>
                  <Text style={[styles.optionLabel, isSelected && styles.selectedOptionLabel]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionDesc}>{option.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            !selectedAnswers[currentStepIndex] && styles.nextBtnDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedAnswers[currentStepIndex]}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {currentStepIndex === QUIZ_STEPS.length - 1 ? 'Generate Calorie Plan' : 'Continue'}
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
  fireworksBox: {
    marginBottom: 12,
  },
  mascotCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  greetingSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginRight: 16,
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
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  questionHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  questionSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedOptionCard: {
    borderColor: '#BEF264',
    backgroundColor: '#F7FEE7',
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#84CC16',
  },
  optionTextGroup: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  selectedOptionLabel: {
    color: '#0F172A',
  },
  optionDesc: {
    fontSize: 12,
    color: '#64748B',
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
  nextBtnDisabled: {
    backgroundColor: '#F1F5F9',
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
