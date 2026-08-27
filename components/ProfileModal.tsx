import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { AuthService } from '@/services/authService';
import { HealthAppsHubModal } from '@/components/HealthAppsHubModal';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const {
    user,
    isPro,
    openPaywall,
    targetCalories,
    setTargetCalories,
    waterTarget,
    setWaterTarget,
    biometrics,
    updateBiometrics,
    setCompletedOnboarding,
    setHasSeenSpinWheel,
    isHealthSyncEnabled,
    setHealthSyncEnabled,
    includeBurnedInBudget,
    setIncludeBurnedInBudget,
    burnedCaloriesToday,
    stepsToday,
    exerciseMinutesToday,
    lastHealthSyncTime,
    healthSyncStatus,
    triggerHealthSync,
    addManualBurnedCalories,
    unitSystem,
    setUnitSystem,
  } = useSubscription();
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { isDarkMode, toggleTheme, colors } = useTheme();

  // Biometrics editing modal state
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [editAge, setEditAge] = useState(String(biometrics?.age || 28));
  const [editHeight, setEditHeight] = useState(String(biometrics?.heightCm || 175));
  const [editWeight, setEditWeight] = useState(String(biometrics?.weightKg || 74));
  const [editGoalWeight, setEditGoalWeight] = useState(String(biometrics?.goalWeightKg || 68));

  // Manual Workout logging modal state
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showHealthHubModal, setShowHealthHubModal] = useState(false);
  const [workoutType, setWorkoutType] = useState<'running' | 'walking' | 'gym' | 'cycling' | 'swimming' | 'custom'>('running');
  const [workoutCalories, setWorkoutCalories] = useState('300');
  const [workoutMinutes, setWorkoutMinutes] = useState('30');
  const [workoutSteps, setWorkoutSteps] = useState('3500');

  const workoutPresets = [
    { type: 'running' as const, label: t('workout_type_running'), emoji: '🏃', cal: 300, min: 30, steps: 3500 },
    { type: 'walking' as const, label: t('workout_type_walking'), emoji: '🚶', cal: 120, min: 30, steps: 3000 },
    { type: 'gym' as const, label: t('workout_type_gym'), emoji: '🏋️', cal: 250, min: 45, steps: 1000 },
    { type: 'cycling' as const, label: t('workout_type_cycling'), emoji: '🚴', cal: 320, min: 45, steps: 500 },
    { type: 'swimming' as const, label: t('workout_type_swimming'), emoji: '🏊', cal: 280, min: 30, steps: 0 },
    { type: 'custom' as const, label: t('workout_type_custom'), emoji: '⚡', cal: 200, min: 30, steps: 1500 },
  ];

  const handleSelectWorkoutPreset = (preset: typeof workoutPresets[0]) => {
    setWorkoutType(preset.type);
    setWorkoutCalories(String(preset.cal));
    setWorkoutMinutes(String(preset.min));
    setWorkoutSteps(String(preset.steps));
  };

  const handleSaveWorkout = async () => {
    const cal = parseInt(workoutCalories, 10) || 0;
    const min = parseInt(workoutMinutes, 10) || 0;
    const stp = parseInt(workoutSteps, 10) || 0;

    if (cal <= 0 && stp <= 0 && min <= 0) {
      Alert.alert('Info', 'Inserisci almeno un valore per calorie, durata o passi.');
      return;
    }

    await addManualBurnedCalories(workoutType, cal, stp, min);
    setShowWorkoutModal(false);
    Alert.alert('Allenamento Salvato 🔥', t('workout_added_success'));
  };

  const handleToggleHealthSync = async (enabled: boolean) => {
    const success = await setHealthSyncEnabled(enabled);
    if (!success && enabled) {
      Alert.alert(t('health_permission_title'), t('health_permission_desc'));
    }
  };

  const handleLogout = async () => {
    onClose();
    await AuthService.signOut();
    router.replace('/auth' as any);
  };

  const handleLoginPress = () => {
    onClose();
    router.push('/auth' as any);
  };

  const handleSaveBiometrics = async () => {
    const ageNum = parseInt(editAge, 10) || 28;
    const heightNum = parseInt(editHeight, 10) || 175;
    const weightNum = parseFloat(editWeight) || 74;
    const goalWeightNum = parseFloat(editGoalWeight) || 68;

    // Calculate BMR & TDEE (Mifflin-St Jeor)
    const gender = biometrics?.gender || 'male';
    let bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + (gender === 'male' ? 5 : -161);
    let tdee = Math.round(bmr * 1.375);

    await updateBiometrics({
      age: ageNum,
      heightCm: heightNum,
      weightKg: weightNum,
      goalWeightKg: goalWeightNum,
      bmr: Math.round(bmr),
      tdee,
    });

    setShowBiometricsModal(false);
    Alert.alert('Settings Saved 💾', t('settings_saved'));
  };

  const displayName = user ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member User') : 'Guest User';
  const displayEmail = user?.email || null;
  const avatarUrl = user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  const waterGoalOptions = [1500, 2000, 2500, 3000, 3500, 4000];

  const formattedLastSync = lastHealthSyncTime
    ? new Date(lastHealthSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('profile_title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* User Profile Summary Card */}
          <View style={[styles.userCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{displayName}</Text>
            {displayEmail ? <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{displayEmail}</Text> : null}

            <View style={[styles.statusBadge, isPro ? styles.proBadge : styles.freeBadge]}>
              <Ionicons name={isPro ? 'sparkles' : 'person'} size={12} color="#0F172A" />
              <Text style={styles.statusBadgeText}>
                {isPro ? t('pro_active') : (user ? t('free_plan') : t('guest_mode'))}
              </Text>
            </View>
          </View>

          {/* Health & Wearables Integration Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="heart" size={20} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('health_sync_section_title')}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    {isHealthSyncEnabled ? t('health_sync_connected_help') : t('health_sync_disconnected_help')}
                  </Text>
                </View>
              </View>
              <Switch
                value={isHealthSyncEnabled}
                onValueChange={handleToggleHealthSync}
                trackColor={{ false: '#CBD5E1', true: '#BEF264' }}
                thumbColor={isHealthSyncEnabled ? '#0F172A' : '#FFFFFF'}
              />
            </View>

            {/* Sub-toggle: Include Burned Calories in Budget */}
            <View style={[styles.innerOptionBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.innerOptionTitle, { color: colors.textPrimary }]}>
                  {t('include_burned_budget_label')}
                </Text>
                <Text style={[styles.innerOptionDesc, { color: colors.textSecondary }]}>
                  {t('include_burned_budget_help')}
                </Text>
              </View>
              <Switch
                value={includeBurnedInBudget}
                onValueChange={(val) => setIncludeBurnedInBudget(val)}
                trackColor={{ false: '#CBD5E1', true: '#84CC16' }}
                thumbColor={includeBurnedInBudget ? '#0F172A' : '#FFFFFF'}
              />
            </View>

            {/* Health Activity Summary & Sync Now Button */}
            <View style={styles.healthStatsRow}>
              <View style={styles.healthStatPill}>
                <Ionicons name="flame" size={16} color="#FF6A45" />
                <Text style={[styles.healthStatText, { color: colors.textPrimary }]}>
                  {burnedCaloriesToday} kcal
                </Text>
              </View>
              <View style={styles.healthStatPill}>
                <Ionicons name="footsteps" size={16} color="#3A8DFF" />
                <Text style={[styles.healthStatText, { color: colors.textPrimary }]}>
                  {stepsToday > 0 ? stepsToday.toLocaleString() : '0'} {t('steps_unit')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.healthSyncBtn, { backgroundColor: isDarkMode ? '#1F382B' : '#DCFCE7' }]}
                onPress={() => triggerHealthSync()}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={healthSyncStatus === 'syncing' ? 'sync' : 'refresh'}
                  size={14}
                  color="#16A34A"
                />
                <Text style={styles.healthSyncBtnText}>
                  {healthSyncStatus === 'syncing' ? t('syncing') : t('sync_short')}
                </Text>
              </TouchableOpacity>
            </View>

            {formattedLastSync && (
              <Text style={[styles.lastSyncLabel, { color: colors.textSecondary }]}>
                {t('last_synced')}: {formattedLastSync}
              </Text>
            )}

            {/* Health Hub Multi-Device Ecosystem Button */}
            <TouchableOpacity
              style={[
                styles.manualWorkoutBtn,
                {
                  borderColor: isDarkMode ? '#1F382B' : '#86EFAC',
                  backgroundColor: isDarkMode ? '#142E1F' : '#F0FDF4',
                  marginTop: 10,
                },
              ]}
              onPress={() => setShowHealthHubModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="hardware-chip-outline" size={18} color="#16A34A" />
              <Text style={[styles.manualWorkoutBtnText, { color: colors.textPrimary, flex: 1 }]}>
                Collega Smartwatch & App (Samsung, Apple, Xiaomi, Huawei...)
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Manual Workout Logger Button */}
            <TouchableOpacity
              style={[styles.manualWorkoutBtn, { borderColor: colors.cardBorder, marginTop: 10 }]}
              onPress={() => setShowWorkoutModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="barbell-outline" size={18} color="#84CC16" />
              <Text style={[styles.manualWorkoutBtnText, { color: colors.textPrimary }]}>
                {t('manual_workout_title')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Dark Mode Switch Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="moon-outline" size={22} color={colors.textPrimary} />
                <View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('dark_mode_title')}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{t('dark_mode_sub')}</Text>
                </View>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#CBD5E1', true: '#BEF264' }}
                thumbColor={isDarkMode ? '#0F172A' : '#FFFFFF'}
              />
            </View>
          </View>

          {/* App Language Selector Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('app_language')} 🌐</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {supportedLanguages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: language === lang.code ? '#BEF264' : colors.inputBg,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: language === lang.code ? '#84CC16' : colors.cardBorder,
                  }}
                  onPress={() => setLanguage(lang.code)}
                >
                  <Text style={{ fontSize: 16 }}>{lang.flag}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: language === lang.code ? '#0F172A' : colors.textPrimary }}>
                    {lang.nativeName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Unit of Measurement Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Ionicons name="scale-outline" size={20} color={colors.coral} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                {t('unit_system') || 'Unità di Misura'} ⚖️
              </Text>
            </View>
            <Text style={[styles.cardSub, { color: colors.textSecondary, marginBottom: 12 }]}>
              {t('unit_system_desc') || 'Scegli il sistema di misura per cibi (g/oz), liquidi (ml/fl oz) e peso corporeo.'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Metric Option */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: unitSystem === 'metric' ? colors.coral : colors.cardBorder,
                  backgroundColor: unitSystem === 'metric' ? (isDarkMode ? '#341E15' : '#FFF0ED') : colors.inputBg,
                  alignItems: 'center',
                }}
                onPress={() => setUnitSystem('metric')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>🇪🇺</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: unitSystem === 'metric' ? colors.coral : colors.textPrimary }}>
                  {t('unit_metric_short') || 'Metrico'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600' }}>
                  g • ml • kg
                </Text>
              </TouchableOpacity>

              {/* Imperial Option */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: unitSystem === 'imperial' ? colors.coral : colors.cardBorder,
                  backgroundColor: unitSystem === 'imperial' ? (isDarkMode ? '#341E15' : '#FFF0ED') : colors.inputBg,
                  alignItems: 'center',
                }}
                onPress={() => setUnitSystem('imperial')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>🇺🇸</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: unitSystem === 'imperial' ? colors.coral : colors.textPrimary }}>
                  {t('unit_imperial_short') || 'Imperiale'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600' }}>
                  oz • fl oz • lbs
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Retake Onboarding Quiz Button */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            onPress={async () => {
              onClose();
              await setCompletedOnboarding(false);
              await setHasSeenSpinWheel(false);
              router.replace('/onboarding' as any);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="clipboard-outline" size={22} color={colors.textPrimary} />
                <View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('personalization_quiz_title')}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{t('personalization_quiz_desc')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Interactive Calorie Target Stepper Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('calorie_goal_setting')}</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{t('adjust_calorie_budget')}</Text>

            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setTargetCalories(Math.max(1200, targetCalories - 50))}
              >
                <Ionicons name="remove" size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.targetBigVal, { color: colors.textPrimary }]}>{targetCalories} kcal</Text>
                <Text style={[styles.targetSubLabel, { color: colors.textSecondary }]}>{t('daily_budget_label')}</Text>
              </View>

              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setTargetCalories(Math.min(5000, targetCalories + 50))}
              >
                <Ionicons name="add" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Water Target Selector Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('water_goal_setting')}</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{t('select_hydration_target')}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {waterGoalOptions.map((ml) => (
                  <TouchableOpacity
                    key={ml}
                    style={{
                      backgroundColor: waterTarget === ml ? '#0284C7' : colors.inputBg,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: waterTarget === ml ? '#0284C7' : colors.cardBorder,
                    }}
                    onPress={() => setWaterTarget(ml)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: waterTarget === ml ? '#FFFFFF' : colors.textPrimary }}>
                      {(ml / 1000).toFixed(1)} L
                    </Text>
                    <Text style={{ fontSize: 10, color: waterTarget === ml ? '#E0F2FE' : colors.textSecondary, marginTop: 2 }}>
                      {ml / 250} {t('glasses')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Edit Biometric Data Action Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={styles.rowBetween}
              onPress={() => setShowBiometricsModal(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="fitness-outline" size={22} color="#84CC16" />
                <View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('edit_biometrics')}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    Weight: {biometrics?.weightKg || 74}kg • Height: {biometrics?.heightCm || 175}cm
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Account Actions Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Account & Membership</Text>

            {!isPro ? (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => {
                  onClose();
                  openPaywall('profile_modal');
                }}
              >
                <Ionicons name="sparkles" size={18} color="#0F172A" />
                <Text style={styles.upgradeBtnText}>Upgrade to MealPulse PRO</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.activeProRow}>
                <Ionicons name="checkmark-circle" size={18} color="#84CC16" />
                <Text style={styles.activeProText}>PRO Subscription Active</Text>
              </View>
            )}

            {!user ? (
              <TouchableOpacity style={[styles.loginCardBtn, { backgroundColor: colors.inputBg }]} onPress={handleLoginPress}>
                <Ionicons name="log-in-outline" size={18} color={colors.textPrimary} />
                <Text style={[styles.loginCardBtnText, { color: colors.textPrimary }]}>{t('sign_in')}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={[styles.menuRowText, { color: '#EF4444' }]}>Log Out / Switch Account</Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Biometrics Modal */}
      <Modal visible={showBiometricsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.biometricsCard, { backgroundColor: colors.modalBg }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('edit_biometrics')}</Text>
              <TouchableOpacity onPress={() => setShowBiometricsModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('age')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="number-pad"
              value={editAge}
              onChangeText={setEditAge}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('height')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="number-pad"
              value={editHeight}
              onChangeText={setEditHeight}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('weight')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="decimal-pad"
              value={editWeight}
              onChangeText={setEditWeight}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('goal_weight')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="decimal-pad"
              value={editGoalWeight}
              onChangeText={setEditGoalWeight}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBiometrics}>
              <Text style={styles.saveBtnText}>{t('save_settings')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Workout Logger Modal */}
      <Modal visible={showWorkoutModal} animationType="slide" transparent onRequestClose={() => setShowWorkoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.biometricsCard, { backgroundColor: colors.modalBg }]}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flame" size={22} color="#FF6A45" />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('manual_workout_title')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowWorkoutModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{t('manual_workout_sub')}</Text>

            {/* Quick Workout Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {workoutPresets.map((p) => {
                  const isSel = workoutType === p.type;
                  return (
                    <TouchableOpacity
                      key={p.type}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isSel ? '#BEF264' : colors.inputBg,
                          borderColor: isSel ? '#84CC16' : colors.cardBorder,
                        },
                      ]}
                      onPress={() => handleSelectWorkoutPreset(p)}
                    >
                      <Text style={{ fontSize: 14 }}>{p.emoji}</Text>
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: isSel ? '#0F172A' : colors.textPrimary },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('workout_calories_label')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              keyboardType="number-pad"
              value={workoutCalories}
              onChangeText={setWorkoutCalories}
              placeholder="e.g. 300"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('workout_minutes_label')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
                  keyboardType="number-pad"
                  value={workoutMinutes}
                  onChangeText={setWorkoutMinutes}
                  placeholder="e.g. 30"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('workout_steps_label')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]}
                  keyboardType="number-pad"
                  value={workoutSteps}
                  onChangeText={setWorkoutSteps}
                  placeholder="e.g. 3500"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWorkout}>
              <Text style={styles.saveBtnText}>{t('add_workout_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Multi-Device Health Hub Modal */}
      <HealthAppsHubModal
        visible={showHealthHubModal}
        onClose={() => setShowHealthHubModal(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  userCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  proBadge: {
    backgroundColor: '#BEF264',
  },
  freeBadge: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  innerOptionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  innerOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  innerOptionDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  healthStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  healthStatPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  healthStatText: {
    fontSize: 12,
    fontWeight: '800',
  },
  healthSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  healthSyncBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  lastSyncLabel: {
    fontSize: 10,
    marginTop: 6,
    fontStyle: 'italic',
  },
  manualWorkoutBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualWorkoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginLeft: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBigVal: {
    fontSize: 22,
    fontWeight: '900',
  },
  targetSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  upgradeBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  upgradeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeProRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  activeProText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#84CC16',
  },
  loginCardBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  loginCardBtnText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginLeft: 8,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  menuRowText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  biometricsCard: {
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
});

