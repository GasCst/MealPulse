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
  } = useSubscription();
  
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [showSpinWheel, setShowSpinWheel] = useState(false);

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.eyebrow}>
            <View style={[styles.eyebrowLine, { backgroundColor: theme.textMuted }]} />
            <Text style={[styles.eyebrowText, { color: theme.textMuted, fontFamily: fontFamilyMono }]}>MENU PRO</Text>
          </View>
          <Text style={[styles.pageTitle, { color: theme.textPrimary, fontFamily: fontFamilyDisplay }]}>Account & Settings</Text>
          <Text style={[styles.pageSub, { color: theme.textSoft }]}>Your profile, scan engine, and daily targets.</Text>
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

        {/* Special 80% OFF Offer Banner for Non-PRO users */}
        {!isPro && (
          <TouchableOpacity
            style={[styles.promoBannerCard, { backgroundColor: isDarkMode ? '#1E2510' : '#F7FEE7', borderColor: theme.lime }]}
            onPress={() => setShowSpinWheel(true)}
            activeOpacity={0.85}
          >
            <View style={styles.promoBannerRow}>
              <Text style={{ fontSize: 24 }}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.promoBadgeText, { color: theme.limeDeep, fontFamily: fontFamilyMono }]}>SPECIAL OFFER ACTIVE</Text>
                <Text style={[styles.promoBannerTitle, { color: theme.textPrimary, fontFamily: fontFamilyDisplay }]}>
                  Claim 80% OFF Jackpot Deal 🎉
                </Text>
                <Text style={[styles.promoBannerSub, { color: theme.textMuted }]}>
                  Get MealPulse PRO for 2,99 €/mo before the discount expires!
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.limeDeep} />
            </View>
          </TouchableOpacity>
        )}

        {/* Vision PRO Upsell (or Active status) */}
        <View style={[styles.visionCard, { backgroundColor: theme.panelBg }]}>
          <Animated.View style={[styles.scanline, animatedScanLineStyle]} />
          
          <View style={styles.visionTag}>
            <View style={[styles.dot, { backgroundColor: theme.lime, shadowColor: theme.lime }]} />
            <Text style={[styles.visionTagText, { color: theme.lime, fontFamily: fontFamilyMono }]}>AI Vision Engine</Text>
          </View>
          
          <Text style={[styles.visionTitle, { fontFamily: fontFamilyDisplay }]}>
            {isPro ? "Vision PRO Active" : "Unlock Vision PRO"}
          </Text>
          <Text style={styles.visionDesc}>
            {isPro ? "Sharper recognition active. You have unlimited scans, multi-item detection, and instant macro breakdowns." : "Sharper recognition on every plate — unlimited scans, multi-item detection, and instant macro breakdowns."}
          </Text>
          
          <View style={styles.visionFeats}>
            <View style={styles.visionFeatRow}>
              <View style={styles.visionFeatIco}><Ionicons name="checkmark" size={14} color={theme.lime} /></View>
              <Text style={styles.visionFeatText}>Unlimited AI photo scans</Text>
            </View>
            <View style={styles.visionFeatRow}>
              <View style={styles.visionFeatIco}><Ionicons name="checkmark" size={14} color={theme.lime} /></View>
              <Text style={styles.visionFeatText}>Multi-item plate detection</Text>
            </View>
            <View style={styles.visionFeatRow}>
              <View style={styles.visionFeatIco}><Ionicons name="checkmark" size={14} color={theme.lime} /></View>
              <Text style={styles.visionFeatText}>Auto portion-size math</Text>
            </View>
          </View>
          
          {!isPro && (
            <TouchableOpacity style={[styles.cta, { backgroundColor: theme.lime }]} onPress={() => openPaywall('settings_tab')} activeOpacity={0.85}>
              <Text style={[styles.ctaText, { fontFamily: fontFamilyDisplay }]}>Activate Vision PRO</Text>
              <Ionicons name="arrow-forward" size={16} color="#14181B" />
            </TouchableOpacity>
          )}
        </View>

        {/* AI Recognition Settings */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: fontFamilyDisplay }]}>AI Recognition</Text>
          <Text style={[styles.sectionNote, { color: theme.textMuted, fontFamily: fontFamilyMono }]}>SCAN ENGINE</Text>
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
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Scan Accuracy</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>Balanced = fast + reliable</Text>
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

            {/* TODO: Hook this up to real average confidence telemetry once available */}
            <View style={[styles.confBar, { backgroundColor: isDarkMode ? '#2C343A' : '#EEEDE3' }]}>
              <View style={[styles.confFill, { backgroundColor: theme.limeDeep, width: '82%' }]} />
            </View>
            <Text style={[styles.rowHelp, { color: theme.textMuted, marginTop: 6 }]}>Avg. confidence score: 82%</Text>
          </View>

          {/* Auto Portion */}
          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: isDarkMode ? '#3A2018' : '#FFE7DE' }]}>
                <Ionicons name="resize-outline" size={18} color="#D9522E" />
              </View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Auto Portion Estimation</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>Sizes food from photo depth cues</Text>
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
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Multi-Item Detection</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>Identify every item on the plate</Text>
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
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Save Scans to Cloud</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>{user ? "Syncs across your devices" : "Sign in required"}</Text>
              </View>
              <CustomToggle isOn={user ? saveScansToCloud : false} onToggle={handleCloudToggle} />
            </View>
          </View>

        </View>

        {/* Preferences & Goals Section */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: fontFamilyDisplay }]}>Preferences & Goals</Text>
          <Text style={[styles.sectionNote, { color: theme.textMuted, fontFamily: fontFamilyMono }]}>DAILY TARGETS</Text>
        </View>

        <View style={styles.stack}>
          
          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: isDarkMode ? '#3A2018' : '#FFE7DE' }]}>
                <Ionicons name="flame-outline" size={18} color="#E8632F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Daily Calorie Target</Text>
              </View>
              <Text style={[styles.rowVal, { color: theme.textPrimary, fontFamily: fontFamilyMono }]}>{targetCalories} kcal</Text>
            </View>
            
            <View style={styles.macroRow}>
              <MacroChip label="Protein" value={protein} progress={(protein/200)*100} color={theme.coral} />
              <MacroChip label="Carbs" value={carbs} progress={(carbs/300)*100} color={theme.blue} />
              <MacroChip label="Fat" value={fat} progress={(fat/100)*100} color={theme.limeDeep} />
            </View>
          </View>

          <View style={[styles.rowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.rowTop}>
              <View style={[styles.rowIco, { backgroundColor: isDarkMode ? '#1A2942' : '#E4EEFF' }]}>
                <Ionicons name="water-outline" size={18} color="#3A8DFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Daily Water Target</Text>
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
                <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Dietary Profile</Text>
                <Text style={[styles.rowHelp, { color: theme.textMuted }]}>Helps AI disambiguate similar foods</Text>
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
                  <Text style={[styles.rowLabel, { color: '#EF4444' }]}>Sign Out</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

        </View>

        {/* Privacy Note */}
        <View style={styles.dividerNote}>
          <Ionicons name="lock-closed" size={14} color={theme.textMuted} style={styles.lockIcon} />
          <Text style={[styles.dividerNoteText, { color: theme.textMuted }]}>
            Photos are processed on-device where possible, then discarded after scanning.
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
});
