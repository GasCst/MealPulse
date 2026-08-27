import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { AuthService } from '@/services/authService';
import { PaywallModal } from '@/components/PaywallModal';
import { SpinWheelModal } from '@/components/SpinWheelModal';

export default function MonetizationScreen() {
  const {
    user,
    isPro,
    openPaywall,
    biometrics,
    targetCalories,
    waterTarget,
    scanAccuracy,
    autoPortionEstimation,
    multiItemDetection,
    saveScansToCloud,
    setScanAccuracy,
    setAutoPortionEstimation,
    setMultiItemDetection,
    setSaveScansToCloud,
    isHealthSyncEnabled,
    includeBurnedInBudget,
    burnedCaloriesToday,
    stepsToday,
    lastHealthSyncTime,
    healthSyncStatus,
    setHealthSyncEnabled,
    setIncludeBurnedInBudget,
    triggerHealthSync,
  } = useSubscription();
  
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(599); // 09:59 countdown

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 599));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Local theme mapped from the redesign mockup
  const theme = isDarkMode ? {
    bg: '#0F1214',           
    cardBg: '#1C2126',       
    cardBorder: '#2C343A',   
    textPrimary: '#F5F4EE',  
    textSoft: '#A3A9AF',     
    textMuted: '#6D747A',    
    lime: '#C8F31D',
    limeDeep: '#9CC400',
    coral: '#FF6A45',
    blue: '#3A8DFF',
    panelBg: '#12161A',
    segmentBg: '#2C343A',
    macroBg: '#2A3036',
    macroBarBg: '#3A424A',
    iconBgBase: '#252B31',
    toggleOff: '#2C343A',
  } : {
    bg: '#F5F4EE',
    cardBg: '#FFFFFF',
    cardBorder: '#E7E5DB',
    textPrimary: '#14181B',
    textSoft: '#4B5259',
    textMuted: '#9A9F95',
    lime: '#C8F31D',
    limeDeep: '#9CC400',
    coral: '#FF6A45',
    blue: '#3A8DFF',
    panelBg: '#12161A',
    segmentBg: '#F0EFE7',
    macroBg: '#F8F7F1',
    macroBarBg: '#E7E5DB',
    iconBgBase: '#F0EFE7',
    toggleOff: '#E4E2D6',
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest Member';
  const userEmail = user ? 'MealPulse Member' : 'Sign in to sync your scan history across devices';

  const scanLineY = useSharedValue(-70);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(300, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animatedScanLineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: scanLineY.value }],
    };
  });

  const handleCloudToggle = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in from the Home tab to sync your scans to the cloud.');
      return;
    }
    setSaveScansToCloud(!saveScansToCloud);
  };

  interface MacroChipProps {
    label: string;
    value: number;
    progress: number;
    color: string;
  }

  interface CustomToggleProps {
    isOn: boolean;
    onToggle: () => void;
  }

  // Reusable Macro Chip Component
  const MacroChip = ({ label, value, progress, color }: MacroChipProps) => (
    <View style={[styles.macroChip, { backgroundColor: theme.macroBg }]}>
      <Text style={[styles.mLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.mVal, { color: theme.textPrimary }]}>{value}g</Text>
      <View style={[styles.mBar, { backgroundColor: theme.macroBarBg }]}>
        <View style={[styles.mFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

  // Custom Toggle Switch
  const CustomToggle = ({ isOn, onToggle }: CustomToggleProps) => {
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={onToggle}
        style={[styles.toggle, { backgroundColor: isOn ? theme.textPrimary : theme.toggleOff }]}
      >
        <View style={[styles.toggleKnob, isOn ? { right: 3, backgroundColor: theme.lime } : { left: 3, backgroundColor: '#FFFFFF' }]} />
      </TouchableOpacity>
    );
  };

  // Fonts helper
  const fontFamilyDisplay = Platform.OS === 'ios' ? 'System' : 'sans-serif';
  const fontFamilyMono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  // Derived macros (fallbacks if not set)
  const protein = biometrics?.targetProtein || 120;
  const carbs = biometrics?.targetCarbs || 195;
  const fat = biometrics?.targetFat || 58;

  const handleHealthToggle = async () => {
    const nextVal = !isHealthSyncEnabled;
    const success = await setHealthSyncEnabled(nextVal);
    if (!success && nextVal) {
      Alert.alert(
        t('health_permission_title'),
        t('health_permission_desc')
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.eyebrow}>
            <View style={[styles.eyebrowLine, { backgroundColor: theme.textMuted }]} />
            <Text style={[styles.eyebrowText, { color: theme.textMuted, fontFamily: fontFamilyMono }]}>{t('menu_pro_eyebrow')}</Text>
          </View>
          <Text style={[styles.pageTitle, { color: theme.textPrimary, fontFamily: fontFamilyDisplay }]}>{t('account_settings_title')}</Text>
          <Text style={[styles.pageSub, { color: theme.textSoft }]}>{t('account_settings_sub')}</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={styles.avatarWrap}>
            {/* Viewfinder brackets */}
            <View style={[styles.bracketTL, { borderColor: theme.lime }]} />
            <View style={[styles.bracketTR, { borderColor: theme.lime }]} />
            <View style={[styles.bracketBL, { borderColor: theme.lime }]} />
            <View style={[styles.bracketBR, { borderColor: theme.lime }]} />
            <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#2A3200' : '#EAF6C9' }]}>
              <Ionicons name="person" size={24} color="#5B6B1E" />
            </View>
          </View>
          
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.profileName, { color: theme.textPrimary, fontFamily: fontFamilyDisplay }]} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={[styles.profileSub, { color: theme.textMuted }]}>
              {userEmail}
            </Text>
          </View>

          <View style={[styles.badgeBase, isPro ? { backgroundColor: theme.lime } : { backgroundColor: theme.iconBgBase }]}>
            <Ionicons name={isPro ? "sparkles" : "shield-outline"} size={11} color={isPro ? "#14181B" : theme.textSoft} />
            <Text style={[styles.badgeText, { color: isPro ? "#14181B" : theme.textSoft, fontFamily: fontFamilyMono }]}>
              {isPro ? "PRO" : "FREE"}
            </Text>
          </View>
        </View>

        {/* Special 80% OFF Urgency Jackpot Offer Card for Non-PRO users */}
        {!isPro && (
          <View
            style={[
              styles.jackpotOfferCard,
              {
                backgroundColor: isDarkMode ? '#171D0E' : '#F7FEE7',
                borderColor: theme.lime,
              },
            ]}
          >
            {/* Top Badges & Live Countdown Timer Row */}
            <View style={styles.jackpotHeaderRow}>
              <View style={[styles.jackpotBadge, { backgroundColor: theme.lime }]}>
                <Ionicons name="flame" size={13} color="#14181B" />
                <Text style={[styles.jackpotBadgeText, { fontFamily: fontFamilyMono }]}>
                  80% OFF • FLASH DEAL
                </Text>
              </View>

              <View
                style={[
                  styles.timerBox,
                  {
                    backgroundColor: isDarkMode ? '#232C13' : '#ECFCCB',
                    borderColor: theme.limeDeep,
                  },
                ]}
              >
                <Ionicons name="timer-outline" size={14} color={theme.limeDeep} />
                <Text style={[styles.timerLabel, { color: theme.limeDeep, fontFamily: fontFamilyMono }]}>
                  {formatCountdown(countdownSeconds)}
                </Text>
              </View>
            </View>

            {/* Headline & Urgency Alert Box */}
            <View style={styles.jackpotContentBox}>
              <Text style={[styles.jackpotTitle, { color: theme.textPrimary, fontFamily: fontFamilyDisplay }]}>
                {t('offer_80_title')}
              </Text>

              <View
                style={[
                  styles.urgencyAlertBox,
                  {
                    backgroundColor: isDarkMode ? 'rgba(255, 106, 69, 0.15)' : '#FFF1EE',
                    borderColor: theme.coral,
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={16} color={theme.coral} />
                <Text style={[styles.urgencyAlertText, { color: theme.coral, fontFamily: fontFamilyMono }]}>
                  {t('offer_80_urgency')}
                </Text>
              </View>

              <Text style={[styles.jackpotSub, { color: theme.textSoft }]}>
                {t('offer_80_sub')}
              </Text>
            </View>

            {/* Interactive CTA to Spin & Claim */}
            <TouchableOpacity
              style={[styles.jackpotCtaBtn, { backgroundColor: theme.lime }]}
              onPress={() => setShowSpinWheel(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.jackpotCtaText, { fontFamily: fontFamilyDisplay }]}>
                {t('spin_and_claim_80')}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#14181B" />
            </TouchableOpacity>
          </View>
        )}

        {/* Vision PRO Upsell (or Active status) */}
        <View style={[styles.visionCard, { backgroundColor: theme.panelBg }]}>
          <Animated.View style={[styles.scanline, animatedScanLineStyle]} />
          
          <View style={styles.visionTag}>
            <View style={[styles.dot, { backgroundColor: theme.lime, shadowColor: theme.lime }]} />
            <Text style={[styles.visionTagText, { color: theme.lime, fontFamily: fontFamilyMono }]}>{t('ai_vision_engine')}</Text>
          </View>
          
          <Text style={[styles.visionTitle, { fontFamily: fontFamilyDisplay }]}>
            {isPro ? t('vision_pro_active') : t('unlock_vision_pro')}
          </Text>
          <Text style={styles.visionDesc}>
            {isPro ? t('vision_pro_desc_active') : t('vision_pro_desc_inactive')}
          </Text>
          
          <View style={styles.visionFeats}>
            <View style={styles.visionFeatRow}>
              <View style={styles.visionFeatIco}><Ionicons name="checkmark" size={14} color={theme.lime} /></View>
              <Text style={styles.visionFeatText}>{t('feat_unlimited_scans')}</Text>
            </View>
            <View style={styles.visionFeatRow}>
              <View style={styles.visionFeatIco}><Ionicons name="checkmark" size={14} color={theme.lime} /></View>
              <Text style={styles.visionFeatText}>{t('feat_multi_item')}</Text>
            </View>
            <View style={styles.visionFeatRow}>
              <View style={styles.visionFeatIco}><Ionicons name="checkmark" size={14} color={theme.lime} /></View>
              <Text style={styles.visionFeatText}>{t('feat_portion_math')}</Text>
            </View>
          </View>
          
          {!isPro && (
            <TouchableOpacity style={[styles.cta, { backgroundColor: theme.lime }]} onPress={() => openPaywall('settings_tab')} activeOpacity={0.85}>
              <Text style={[styles.ctaText, { fontFamily: fontFamilyDisplay }]}>{t('activate_vision_pro')}</Text>
              <Ionicons name="arrow-forward" size={16} color="#14181B" />
            </TouchableOpacity>
          )}
        </View>

        {/* AI Recognition Settings */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: fontFamilyDisplay }]}>{t('ai_recognition_title')}</Text>
          <Text style={[styles.sectionNote, { color: theme.textMuted, fontFamily: fontFamilyMono }]}>{t('scan_engine_note')}</Text>
        </View>

        <View style={styles.stack}>
          
          {/* Scan Accuracy */}
          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.bracketTL_small} />
            <View style={styles.bracketTR_small} />
            <View style={styles.bracketBL_small} />
            <View style={styles.bracketBR_small} />

            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: isDarkMode ? '#29321A' : '#EAF6D0' }]}>
                <Ionicons name="scan-outline" size={18} color="#5B6B1E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('scan_accuracy_label')}</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>{t('scan_accuracy_help')}</Text>
              </View>
            </View>
            
            <View style={[styles.segmented, { backgroundColor: theme.segmentBg }]}>
              {['Fast', 'Balanced', 'Precise'].map((opt) => (
                <TouchableOpacity 
                  key={opt}
                  style={[styles.segOpt, scanAccuracy === opt && { backgroundColor: theme.textPrimary }]}
                  onPress={() => setScanAccuracy(opt as 'Fast' | 'Balanced' | 'Precise')}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.segOptText, 
                    { color: scanAccuracy === opt ? theme.lime : theme.textSoft, fontFamily: fontFamilyMono }
                  ]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.confBar, { backgroundColor: isDarkMode ? '#2C343A' : '#EEEDE3' }]}>
              <View style={[styles.confFill, { backgroundColor: theme.limeDeep, width: '82%' }]} />
            </View>
            <Text style={[styles.rowHelp, { color: theme.textMuted, marginTop: 6 }]}>Avg. accuracy: 82%</Text>
          </View>

          {/* Auto Portion */}
          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: isDarkMode ? '#3A2018' : '#FFE7DE' }]}>
                <Ionicons name="resize-outline" size={18} color="#D9522E" />
              </View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('auto_portion_label')}</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>{t('auto_portion_help')}</Text>
              </View>
              <CustomToggle isOn={autoPortionEstimation} onToggle={() => setAutoPortionEstimation(!autoPortionEstimation)} />
            </View>
          </View>

          {/* Multi-Item Detection */}
          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: isDarkMode ? '#1A2942' : '#E4EEFF' }]}>
                <Ionicons name="grid-outline" size={18} color="#3A6FCC" />
              </View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('multi_item_label')}</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>{t('multi_item_help')}</Text>
              </View>
              <CustomToggle isOn={multiItemDetection} onToggle={() => setMultiItemDetection(!multiItemDetection)} />
            </View>
          </View>

          {/* Save to Cloud */}
          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: theme.iconBgBase }]}>
                <Ionicons name="cloud-upload-outline" size={18} color="#7B8072" />
              </View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('save_cloud_label')}</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>{user ? t('save_cloud_help_on') : t('save_cloud_help_off')}</Text>
              </View>
              <CustomToggle isOn={user ? saveScansToCloud : false} onToggle={handleCloudToggle} />
            </View>
          </View>

        </View>

        {/* Health & Wearables Synchronization Section */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: fontFamilyDisplay }]}>{t('health_sync_section_title')}</Text>
          <Text style={[styles.sectionNote, { color: theme.textMuted, fontFamily: fontFamilyMono }]}>{Platform.OS === 'ios' ? 'APPLE HEALTHKIT' : 'GOOGLE HEALTH CONNECT'}</Text>
        </View>

        <View style={styles.stack}>
          {/* Health Sync Switch */}
          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: isDarkMode ? '#3A141A' : '#FFEBEF' }]}>
                <Ionicons name="heart" size={18} color="#EF4444" />
              </View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('health_sync_toggle_label')}</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>
                  {isHealthSyncEnabled ? t('health_sync_connected_help') : t('health_sync_disconnected_help')}
                </Text>
              </View>
              <CustomToggle isOn={isHealthSyncEnabled} onToggle={handleHealthToggle} />
            </View>

            {isHealthSyncEnabled && (
              <View style={[styles.healthSyncStatusRow, { borderTopColor: theme.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.healthSyncStatusText, { color: theme.textSoft }]}>
                    🔥 {burnedCaloriesToday} kcal • 👟 {stepsToday.toLocaleString()} {t('steps_unit')}
                  </Text>
                  {lastHealthSyncTime && (
                    <Text style={[styles.healthLastSyncText, { color: theme.textMuted }]}>
                      {t('last_synced')}: {new Date(lastHealthSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.syncNowBtn, { backgroundColor: isDarkMode ? '#1F382B' : '#E8F7D0' }]}
                  onPress={() => triggerHealthSync()}
                  activeOpacity={0.75}
                >
                  <Ionicons name={healthSyncStatus === 'syncing' ? 'sync' : 'refresh'} size={14} color={theme.limeDeep} />
                  <Text style={[styles.syncNowBtnText, { color: theme.limeDeep }]}>{healthSyncStatus === 'syncing' ? '...' : t('sync_now')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Include in Daily Budget Switch */}
          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: isDarkMode ? '#3A2018' : '#FFE7DE' }]}>
                <Ionicons name="calculator-outline" size={18} color="#FF6A45" />
              </View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('include_burned_budget_label')}</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>{t('include_burned_budget_help')}</Text>
              </View>
              <CustomToggle isOn={includeBurnedInBudget} onToggle={() => setIncludeBurnedInBudget(!includeBurnedInBudget)} />
            </View>
          </View>
        </View>

        {/* Preferences & Goals Section */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: fontFamilyDisplay }]}>{t('preferences_goals_title')}</Text>
          <Text style={[styles.sectionNote, { color: theme.textMuted, fontFamily: fontFamilyMono }]}>{t('daily_targets_note')}</Text>
        </View>

        <View style={styles.stack}>
          
          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: isDarkMode ? '#3A2018' : '#FFE7DE' }]}>
                <Ionicons name="flame-outline" size={18} color="#E8632F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('daily_calorie_target')}</Text>
              </View>
              <Text style={[styles.rowVal, { color: theme.textPrimary, fontFamily: fontFamilyMono }]}>{targetCalories} {t('kcal')}</Text>
            </View>
            
            <View style={styles.macroRow}>
              <MacroChip label={t('protein_left')} value={protein} progress={(protein/200)*100} color={theme.coral} />
              <MacroChip label={t('carb_left')} value={carbs} progress={(carbs/300)*100} color={theme.blue} />
              <MacroChip label={t('fat_left')} value={fat} progress={(fat/100)*100} color={theme.limeDeep} />
            </View>
          </View>

          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: isDarkMode ? '#1A2942' : '#E4EEFF' }]}>
                <Ionicons name="water-outline" size={18} color="#3A8DFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('daily_water_target')}</Text>
              </View>
              <Text style={[styles.rowVal, { color: theme.textPrimary, fontFamily: fontFamilyMono }]}>{waterTarget} ml</Text>
            </View>
          </View>

          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: theme.iconBgBase }]}>
                <Ionicons name="restaurant-outline" size={18} color="#7B8072" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('dietary_profile')}</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>{t('dietary_profile_help')}</Text>
              </View>
              <Text style={[styles.rowVal, { color: theme.textMuted, fontWeight: '500' }]}>{biometrics?.dietPreference || 'Omnivore'} ›</Text>
            </View>
          </View>

          {user && (
            <TouchableOpacity 
              style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
              onPress={() => AuthService.signOut()}
            >
              <View style={styles.rowTop}>
                <View style={[styles.rowIco, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: '#EF4444' }]}>{t('sign_out')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

        </View>

        {/* Privacy Note */}
        <View style={styles.dividerNote}>
          <Ionicons name="lock-closed" size={14} color={theme.textMuted} style={styles.lockIcon} />
          <Text style={[styles.dividerNoteText, { color: theme.textMuted }]}>
            {t('privacy_note_text')}
          </Text>
        </View>

      </ScrollView>
      <PaywallModal />
      <SpinWheelModal visible={showSpinWheel} onClose={() => setShowSpinWheel(false)} />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    marginTop: 10,
  },
  eyebrowLine: {
    width: 14,
    height: 1,
  },
  eyebrowText: {
    fontSize: 11,
    letterSpacing: 1.5,
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 14,
    marginBottom: 20,
  },
  header: {
    marginBottom: 0,
  },
  profileCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
    padding: 6,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bracketTL: { position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 4 },
  bracketTR: { position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 4 },
  bracketBL: { position: 'absolute', bottom: 0, left: 0, width: 14, height: 14, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 4 },
  bracketBR: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 4 },
  bracketTL_small: { position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 4, borderColor: '#C8F31D' },
  bracketTR_small: { position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 4, borderColor: '#C8F31D' },
  bracketBL_small: { position: 'absolute', bottom: -1, left: -1, width: 14, height: 14, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 4, borderColor: '#C8F31D' },
  bracketBR_small: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 4, borderColor: '#C8F31D' },
  
  profileName: {
    fontSize: 16.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileSub: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  visionCard: {
    borderRadius: 22,
    padding: 22,
    paddingBottom: 20,
    marginBottom: 26,
    overflow: 'hidden',
    position: 'relative',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 70,
    backgroundColor: 'rgba(200,243,29,0.12)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(200,243,29,0.3)',
  },
  visionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200,243,29,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,243,29,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  visionTagText: {
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  visionTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#F5F4EE',
    marginBottom: 8,
  },
  visionDesc: {
    fontSize: 13,
    color: '#B7BCB4',
    lineHeight: 19,
    marginBottom: 16,
  },
  visionFeats: {
    gap: 9,
    marginBottom: 18,
  },
  visionFeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  visionFeatIco: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(200,243,29,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visionFeatText: {
    fontSize: 13,
    color: '#E7E9E2',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  ctaText: {
    color: '#14181B',
    fontSize: 14.5,
    fontWeight: '700',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionNote: {
    fontSize: 10.5,
  },
  stack: {
    gap: 10,
    marginBottom: 26,
  },
  rowCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIco: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  rowHelp: {
    fontSize: 11.5,
    marginTop: 1,
  },
  rowVal: {
    fontSize: 14.5,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 11,
    padding: 3,
    marginTop: 12,
  },
  segOpt: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  segOptText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  confBar: {
    height: 6,
    borderRadius: 6,
    marginTop: 12,
    overflow: 'hidden',
  },
  confFill: {
    height: '100%',
    borderRadius: 6,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  macroChip: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    paddingBottom: 9,
  },
  mLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  mVal: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  mBar: {
    height: 4,
    borderRadius: 4,
    marginTop: 7,
    overflow: 'hidden',
  },
  mFill: {
    height: '100%',
    borderRadius: 4,
  },
  toggle: {
    width: 42,
    height: 25,
    borderRadius: 20,
    justifyContent: 'center',
  },
  toggleKnob: {
    position: 'absolute',
    width: 19,
    height: 19,
    borderRadius: 9.5,
  },
  dividerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  lockIcon: {
    flexShrink: 0,
  },
  dividerNoteText: {
    fontSize: 11.5,
    flex: 1,
  },
  jackpotOfferCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 20,
    gap: 12,
  },
  jackpotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jackpotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  jackpotBadgeText: {
    color: '#14181B',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  jackpotContentBox: {
    gap: 8,
  },
  jackpotTitle: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  urgencyAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  urgencyAlertText: {
    fontSize: 11.5,
    fontWeight: '800',
    flex: 1,
    lineHeight: 15,
  },
  jackpotSub: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  jackpotCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 2,
  },
  jackpotCtaText: {
    color: '#14181B',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  promoBannerCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  promoBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  promoBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  promoBannerSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  healthSyncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  healthSyncStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  healthLastSyncText: {
    fontSize: 10.5,
    marginTop: 2,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  syncNowBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginTop: 12,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
