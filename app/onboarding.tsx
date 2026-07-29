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
    subtitle: 'We will calculate your optimal daily calorie & macro targets.',
    options: [
      { id: 'g_lose', label: '🔥 Weight Loss & Fat Burn', desc: 'Calorie deficit with high protein retention' },
      { id: 'g_muscle', label: '💪 Build Lean Muscle', desc: 'Protein surplus and optimal macro balance' },
      { id: 'g_maintain', label: '⚖️ Maintain Current Weight', desc: 'Balanced energy maintenance' },
      { id: 'g_energy', label: '⚡ Boost Daily Energy', desc: 'Clean whole foods & nutrient optimization' },
    ],
  },
  {
    id: 2,
    title: 'What is your current activity level?',
    subtitle: 'This helps adjust your Total Daily Energy Expenditure (TDEE).',
    options: [
      { id: 'act_sedentary', label: '🪑 Desk / Sedentary', desc: 'Little to no daily exercise' },
      { id: 'act_light', label: '🚶 Lightly Active', desc: '1–3 workouts or walks per week' },
      { id: 'act_moderate', label: '🏋️ Moderately Active', desc: '3–5 gym sessions or sports' },
      { id: 'act_intense', label: '🔥 Athlete / Intense', desc: '6+ heavy training sessions per week' },
    ],
  },
  {
    id: 3,
    title: 'Do you follow a specific dietary preference?',
    subtitle: 'Our AI scanner tailors food recommendations to your diet.',
    options: [
      { id: 'd_flexible', label: '🥗 Flexible / Anything', desc: 'No strict dietary restrictions' },
      { id: 'd_highprotein', label: '🥩 High Protein / Fitness', desc: 'Prioritizes lean meats & protein shakes' },
      { id: 'd_keto', label: '🥑 Low Carb / Keto', desc: 'Higher healthy fats, minimal carbohydrates' },
      { id: 'd_veg', label: '🌱 Vegetarian / Vegan', desc: 'Plant-based whole foods' },
    ],
  },
  {
    id: 4,
    title: 'How do you currently track your food intake?',
    subtitle: 'Photo AI scanning is proven to be 5x faster than manual typing.',
    options: [
      { id: 't_never', label: '📱 Never tracked before', desc: 'Want effortless camera photo scanning' },
      { id: 't_manual', label: '📝 Typed manually in MyFitnessPal', desc: 'Tired of tedious food searching' },
      { id: 't_inconsistent', label: '⏳ Tracked on and off', desc: 'Need a fast daily routine' },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { setCompletedOnboarding } = useSubscription();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationText, setGenerationText] = useState('Calculating BMR & TDEE...');
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  const currentStep = QUIZ_STEPS[currentStepIndex];

  const handleSelectOption = (optionId: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [currentStepIndex]: optionId }));
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
    setIsGenerating(true);
    setGenerationProgress(20);
    setGenerationText('Calculating Basal Metabolic Rate (BMR)...');

    await new Promise((r) => setTimeout(r, 700));
    setGenerationProgress(55);
    setGenerationText('Optimizing Protein, Carb & Fat split...');

    await new Promise((r) => setTimeout(r, 800));
    setGenerationProgress(85);
    setGenerationText('Calibrating AI Camera Visual Recognition Model...');

    await new Promise((r) => setTimeout(r, 700));
    setGenerationProgress(100);
    setGenerationText('Macro Plan Ready! Target: 1,920 kcal (145g Protein)');

    await new Promise((r) => setTimeout(r, 600));
    setIsGenerating(false);
    await setCompletedOnboarding(true);
    setShowPaywallModal(true);
  };

  const handlePaywallClose = () => {
    setShowPaywallModal(false);
    router.replace('/(tabs)');
  };

  if (isGenerating) {
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
        <Text style={styles.questionTitle}>{currentStep.title}</Text>
        <Text style={styles.questionSub}>{currentStep.subtitle}</Text>

        <View style={styles.optionsList}>
          {currentStep.options.map((option) => {
            const isSelected = selectedAnswers[currentStepIndex] === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, isSelected && styles.selectedOptionCard]}
                onPress={() => handleSelectOption(option.id)}
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
            {currentStepIndex === QUIZ_STEPS.length - 1 ? 'Generate Macro Plan' : 'Continue'}
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
    paddingTop: 20,
    paddingBottom: 30,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  questionSub: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
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
    fontSize: 16,
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
