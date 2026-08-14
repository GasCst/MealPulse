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
  } = useSubscription();
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { isDarkMode, toggleTheme, colors } = useTheme();

  // Biometrics editing modal state
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [editAge, setEditAge] = useState(String(biometrics?.age || 28));
  const [editHeight, setEditHeight] = useState(String(biometrics?.heightCm || 175));
  const [editWeight, setEditWeight] = useState(String(biometrics?.weightKg || 74));
  const [editGoalWeight, setEditGoalWeight] = useState(String(biometrics?.goalWeightKg || 68));

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

          {/* Retake Onboarding Quiz Button */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            onPress={async () => {
              onClose();
              await setCompletedOnboarding(false);
              router.replace('/onboarding' as any);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="clipboard-outline" size={22} color={colors.textPrimary} />
                <View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Personalization Quiz</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Retake Onboarding & Recalculate Plan</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Interactive Calorie Target Stepper Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('calorie_goal_setting')}</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Adjust daily calorie budget</Text>

            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setTargetCalories(Math.max(1200, targetCalories - 50))}
              >
                <Ionicons name="remove" size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.targetBigVal, { color: colors.textPrimary }]}>{targetCalories} kcal</Text>
                <Text style={[styles.targetSubLabel, { color: colors.textSecondary }]}>Daily Budget</Text>
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
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Select daily hydration target</Text>

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
                      {ml / 250} glasses
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
