import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';

interface MacroRingItemProps {
  label: string;
  emoji: string;
  current: number;
  target: number;
  color: string;
  trackColor?: string;
}

const MacroRingItem: React.FC<MacroRingItemProps> = ({
  label,
  emoji,
  current,
  target,
  color,
  trackColor = '#F1F5F9',
}) => {
  const size = 90;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const pct = Math.min(100, Math.round((current / (target || 1)) * 100));
  const strokeDashoffset = circumference - (circumference * pct) / 100;

  return (
    <View style={styles.macroRingCardItem}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          {/* Background Track Ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>

        {/* Center Content (Emoji + Current Value) */}
        <View style={styles.macroRingCenter}>
          <Text style={{ fontSize: 17, marginBottom: 1 }}>{emoji}</Text>
          <Text style={styles.macroRingVal}>{current}g</Text>
        </View>
      </View>

      {/* Under Ring Text & Target */}
      <Text style={styles.macroRingLabel}>{label}</Text>
      <Text style={styles.macroRingSub}>
        {current} / {target}g
      </Text>
      
      <View style={[styles.macroRingBadge, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.macroRingBadgeText, { color }]}>{pct}%</Text>
      </View>
    </View>
  );
};
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { PaywallModal } from '@/components/PaywallModal';
import { SupabaseService, ExpoGoSafeAsyncStorage } from '@/services/supabaseService';
import { ProfileModal } from '@/components/ProfileModal';
import { NotificationModal } from '@/components/NotificationModal';
import { analyzeMealPlateImage, MealVisionResult } from '@/services/aiVisionService';
import { AdScanModal } from '@/components/AdScanModal';
import { ManualMealModal } from '@/components/ManualMealModal';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { WaterTrackerCard } from '@/components/WaterTrackerCard';
import { FastingTimerCard } from '@/components/FastingTimerCard';
import { AdBanner } from '@/components/AdBanner';

interface LoggedMeal {
  id: string;
  category: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUri?: string;
  time: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isPro, freeUsageCount, maxFreeUsage, recordUsage, openPaywall, targetCalories, biometrics, beginWrite, endWrite } = useSubscription();
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest User';
  const avatarUrl = user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  const [mealsByDate, setMealsByDate] = useState<Record<string, LoggedMeal[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const selectedDateKey = getDateKey(selectedDate);
  const meals = mealsByDate[selectedDateKey] || [];

  useEffect(() => {
    loadMealsForDate(selectedDate);
  }, [user, selectedDateKey]);

  const loadMealsForDate = async (targetDate: Date) => {
    const key = getDateKey(targetDate);

    if (!user?.id) {
      // Guest User Mode: Load guest meals from local storage or reset
      const guestKey = `@mealpulse_guest_meals_v1_${key}`;
      const savedGuest = await ExpoGoSafeAsyncStorage.getItem(guestKey);
      if (savedGuest) {
        try {
          setMealsByDate((prev) => ({ ...prev, [key]: JSON.parse(savedGuest) }));
        } catch {
          setMealsByDate((prev) => ({ ...prev, [key]: [] }));
        }
      } else {
        setMealsByDate((prev) => ({ ...prev, [key]: [] }));
      }
      return;
    }

    const cloudLogs = await SupabaseService.fetchMealLogsByUserAndDate(user.id, key);

    if (cloudLogs && cloudLogs.length > 0) {
      const mapped: LoggedMeal[] = cloudLogs.map((m) => ({
        id: m.id,
        category: m.meal_type || 'Dinner',
        name: m.food_name,
        calories: Number(m.calories || 0),
        protein: Number(m.protein_g || 0),
        carbs: Number(m.carbs_g || 0),
        fat: Number(m.fat_g || 0),
        imageUri: m.image_url || undefined,
        time: m.logged_at
          ? new Date(m.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Today',
      }));
      setMealsByDate((prev) => ({
        ...prev,
        [key]: mapped,
      }));
    } else {
      setMealsByDate((prev) => ({
        ...prev,
        [key]: [],
      }));
    }
  };

  const getWeekDays = (centerDate: Date) => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(centerDate);
      d.setDate(centerDate.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showAdScanModal, setShowAdScanModal] = useState(false);
  const [showManualMealModal, setShowManualMealModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<MealVisionResult | null>(null);

  const handleAddManualOrBarcodeMeal = async (meal: { name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    beginWrite();
    try {
      const mealId = `meal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newMeal: LoggedMeal = {
        id: mealId,
        category: 'Logged Food',
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const currentKey = getDateKey(selectedDate);
      const updatedList = [newMeal, ...(mealsByDate[currentKey] || [])];
      setMealsByDate((prev) => ({
        ...prev,
        [currentKey]: updatedList,
      }));

      if (!user?.id) {
        const guestKey = `@mealpulse_guest_meals_v1_${currentKey}`;
        await ExpoGoSafeAsyncStorage.setItem(guestKey, JSON.stringify(updatedList));
      } else {
        await SupabaseService.saveMealLog({
          id: mealId,
          user_id: user.id,
          food_name: meal.name,
          estimated_weight_g: 100,
          calories: meal.calories,
          protein_g: meal.protein,
          carbs_g: meal.carbs,
          fat_g: meal.fat,
          meal_type: 'Logged Food',
          logging_method: 'manual',
        });
        await loadMealsForDate(selectedDate);
      }
    } finally {
      endWrite();
    }
  };

  // Meal Detail / Edit / Delete Modal State
  const [selectedMealForDetail, setSelectedMealForDetail] = useState<LoggedMeal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEditingMeal, setIsEditingMeal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');

  const handleOpenMealDetail = (meal: LoggedMeal) => {
    setSelectedMealForDetail(meal);
    setEditName(meal.name);
    setEditCalories(String(meal.calories));
    setEditProtein(String(meal.protein));
    setEditCarbs(String(meal.carbs));
    setEditFat(String(meal.fat));
    setIsEditingMeal(false);
    setShowDetailModal(true);
  };

  const handleSaveMealEdit = async () => {
    if (!selectedMealForDetail) return;

    const updatedMeal: LoggedMeal = {
      ...selectedMealForDetail,
      name: editName || selectedMealForDetail.name,
      calories: Number(editCalories) || selectedMealForDetail.calories,
      protein: Number(editProtein) || selectedMealForDetail.protein,
      carbs: Number(editCarbs) || selectedMealForDetail.carbs,
      fat: Number(editFat) || selectedMealForDetail.fat,
    };

    const key = selectedDateKey;
    setMealsByDate((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((m) => (m.id === selectedMealForDetail.id ? updatedMeal : m)),
    }));

    if (user?.id && selectedMealForDetail.id) {
      await SupabaseService.updateMealLog(selectedMealForDetail.id, {
        food_name: updatedMeal.name,
        calories: updatedMeal.calories,
        protein_g: updatedMeal.protein,
        carbs_g: updatedMeal.carbs,
        fat_g: updatedMeal.fat,
      });
    }

    setSelectedMealForDetail(updatedMeal);
    setIsEditingMeal(false);
    Alert.alert('Meal Updated', `${updatedMeal.name} details have been updated successfully.`);
  };

  const handleDeleteMeal = async () => {
    if (!selectedMealForDetail) return;

    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete ${selectedMealForDetail.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const mealId = selectedMealForDetail.id;
            const key = selectedDateKey;

            setMealsByDate((prev) => ({
              ...prev,
              [key]: (prev[key] || []).filter((m) => m.id !== mealId),
            }));

            if (user?.id && mealId) {
              await SupabaseService.deleteMealLog(mealId);
            }

            setShowDetailModal(false);
            setSelectedMealForDetail(null);
          },
        },
      ]
    );
  };

  // Custom API Key modal state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [adPurpose, setAdPurpose] = useState<'ai_scan' | 'barcode_scan' | null>('ai_scan');

  // Calculate Totals & Target Macros
  const totalCalories = meals.reduce((acc, m) => acc + m.calories, 0);
  const totalProtein = meals.reduce((acc, m) => acc + m.protein, 0);
  const totalCarbs = meals.reduce((acc, m) => acc + m.carbs, 0);
  const totalFat = meals.reduce((acc, m) => acc + m.fat, 0);

  const targetProtein = biometrics?.targetProtein || 135;
  const targetCarbs = biometrics?.targetCarbs || 210;
  const targetFat = biometrics?.targetFat || 65;

  const proteinPct = Math.min(100, Math.round((totalProtein / targetProtein) * 100));
  const carbsPct = Math.min(100, Math.round((totalCarbs / targetCarbs) * 100));
  const fatPct = Math.min(100, Math.round((totalFat / targetFat) * 100));

  // Dynamic Scroll 3D Vertical Rotation Animation
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const animatedMacroStyle = useAnimatedStyle(() => {
    const rotateX = interpolate(scrollY.value, [0, 80], [25, 0], Extrapolation.CLAMP);
    const scale = interpolate(scrollY.value, [0, 80], [0.92, 1], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 80], [0.5, 1], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [
        { perspective: 800 },
        { rotateX: `${rotateX}deg` },
        { scale },
      ],
    };
  });

  const triggerScanFlow = (base64: string, imageUri: string) => {
    setCapturedImageUri(imageUri);
    setPendingBase64(base64);
    setAdPurpose('ai_scan');

    if (!isPro) {
      // Free Tier: MUST watch sponsor ad BEFORE ScannerModal & AI vision analysis
      setShowAdScanModal(true);
    } else {
      // PRO Tier: Instant scanning with 0 ads & 0 popups!
      setShowScannerModal(true);
      runAiAnalysis(base64);
    }
  };

  const handleAdCompleted = () => {
    setShowAdScanModal(false);
    const purpose = adPurpose;
    const b64 = pendingBase64;

    // Reset state immediately to prevent double-opening
    setAdPurpose(null);
    setPendingBase64(null);

    if (purpose === 'barcode_scan') {
      setShowBarcodeModal(true);
    } else if (b64) {
      // Launch Scanner Modal ONLY AFTER sponsor ad completes!
      setShowScannerModal(true);
      runAiAnalysis(b64);
    }
  };

  const handleAiPhotoScanChoice = () => {
    Alert.alert(
      'AI Photo Scan 📸',
      'Choose how you want to add your meal photo:',
      [
        {
          text: '📷 Take Photo',
          onPress: handleLaunchCamera,
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: handleLaunchGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleLaunchCamera = async () => {
    recordUsage();

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to scan meal plates.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      console.log(`[UI Camera Picked] Image URI: ${result.assets[0].uri}, base64 length: ${result.assets[0].base64?.length || 0}`);
      triggerScanFlow(result.assets[0].base64 || '', result.assets[0].uri);
    }
  };

  const handleLaunchGallery = async () => {
    recordUsage();

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required to pick meal photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      console.log(`[UI Gallery Picked] Image URI: ${result.assets[0].uri}, base64 length: ${result.assets[0].base64?.length || 0}`);
      triggerScanFlow(result.assets[0].base64 || '', result.assets[0].uri);
    }
  };

  const runAiAnalysis = async (base64: string) => {
    setIsScanning(true);
    setScanResult(null);

    try {
      console.log('[UI runAiAnalysis] Executing analyzeMealPlateImage...');
      const result = await analyzeMealPlateImage(base64, customApiKey);
      console.log('[UI runAiAnalysis Success] Result received:', JSON.stringify(result));
      setScanResult(result);
    } catch (err: any) {
      console.error('[UI runAiAnalysis Error]', err);
      setIsScanning(false);
      setShowScannerModal(false);
      Alert.alert('AI Vision API Debug Log 🔍', err.message || 'Failed to connect to AI Vision API.');
      return;
    }

    setIsScanning(false);
  };

  const handleSaveScannedMeal = async () => {
    if (!scanResult) return;
    beginWrite();
    try {
      const mealId = `meal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newMeal: LoggedMeal = {
        id: mealId,
        category: 'Dinner',
        name: scanResult.food_name,
        calories: scanResult.calories,
        protein: scanResult.protein_g,
        carbs: scanResult.carbs_g,
        fat: scanResult.fat_g,
        imageUri: capturedImageUri || undefined,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Save to local UI state for active date key
      const currentKey = getDateKey(selectedDate);
      const updatedList = [newMeal, ...(mealsByDate[currentKey] || [])];
      setMealsByDate((prev) => ({
        ...prev,
        [currentKey]: updatedList,
      }));

      if (!user?.id) {
        const guestKey = `@mealpulse_guest_meals_v1_${currentKey}`;
        await ExpoGoSafeAsyncStorage.setItem(guestKey, JSON.stringify(updatedList));
        Alert.alert('Meal Saved! 🥗', `${scanResult.food_name} (${scanResult.calories} kcal) saved locally.`);
      } else {
        await SupabaseService.saveMealLog({
          id: mealId,
          user_id: user.id,
          food_name: scanResult.food_name,
          estimated_weight_g: scanResult.estimated_weight_g,
          calories: scanResult.calories,
          protein_g: scanResult.protein_g,
          carbs_g: scanResult.carbs_g,
          fat_g: scanResult.fat_g,
          meal_type: 'Dinner',
          image_url: capturedImageUri || undefined,
          logging_method: 'ai_photo',
          confidence_score: scanResult.confidence,
          item_count: scanResult.item_count || 1,
          unit_weight_g: scanResult.unit_weight_g || scanResult.estimated_weight_g,
          health_score: scanResult.health_score,
          ai_insights: scanResult.insights,
        });
        await loadMealsForDate(selectedDate);
        Alert.alert('Meal Saved to Cloud! ☁️', `${scanResult.food_name} (${scanResult.calories} kcal) saved to your Supabase account.`);
      }

      setShowScannerModal(false);
      setCapturedImageUri(null);
      setScanResult(null);
    } finally {
      endWrite();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <Animated.ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Top Header Bar */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.userProfileGroup} onPress={() => setShowProfileModal(true)}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImg}
            />
            <View>
              <Text style={[styles.greetingText, { color: colors.textSecondary }]}>{user ? t('good_morning') : t('welcome')}</Text>
              <Text style={[styles.userNameText, { color: colors.textPrimary }]}>{userName}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            {!user && (
              <TouchableOpacity
                style={styles.guestLoginPill}
                onPress={() => router.push('/auth' as any)}
              >
                <Ionicons name="log-in-outline" size={14} color="#0F172A" />
                <Text style={styles.guestLoginPillText}>{t('sign_in')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.circleIconBtn} onPress={() => setShowNotifModal(true)}>
              <Ionicons name="notifications-outline" size={20} color="#1E293B" />
              <View style={styles.redBadge} />
            </TouchableOpacity>
          </View>
        </View>

        {/* AdMob Banner Ad (Disappears ONLY if PRO plan is active) */}
        <AdBanner location="home_page" />

        {/* Hero Weekly Progress Card */}
        <View style={styles.weeklyProgressHeroCard}>
          <View style={styles.heroLeftCol}>
            <View style={styles.dailyIntakePill}>
              <Ionicons name="flash" size={12} color="#0F172A" />
              <Text style={styles.dailyIntakePillText}>{t('daily_intake')}</Text>
            </View>
            <Text style={styles.heroWeeklyTitle}>{t('daily_progress')}</Text>
            <Text style={styles.heroSubText}>
              {totalCalories} / {targetCalories} {t('kcal_logged')}
            </Text>
          </View>

          {/* Circular Progress Gauge */}
          <View style={styles.gaugeContainer}>
            <View style={styles.outerCircleGauge}>
              <View style={styles.innerCircleGauge}>
                <Text style={styles.gaugeDaysNum}>6</Text>
                <Text style={styles.gaugeDaysLabel}>days</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dynamic Daily Macro Visualization Card (3D Vertical Tilt Entrance on Scroll) */}
        <Animated.View style={[styles.macroCard, animatedMacroStyle]}>
          <View style={styles.macroHeaderRow}>
            <View style={styles.macroTitleGroup}>
              <View style={styles.macroIconCircle}>
                <Ionicons name="pie-chart" size={16} color="#84CC16" />
              </View>
              <View>
                <Text style={styles.macroCardTitle}>Daily Macro Targets</Text>
                <Text style={styles.macroCardSub}>Updated dynamically from logged meals</Text>
              </View>
            </View>
          </View>

          {/* 3 Donut/Circular Rings in a Single Row */}
          <View style={styles.macroRingsRow}>
            <MacroRingItem
              label="Protein"
              emoji="🍗"
              current={totalProtein}
              target={targetProtein}
              color="#84CC16"
            />
            <MacroRingItem
              label="Carbs"
              emoji="🍞"
              current={totalCarbs}
              target={targetCarbs}
              color="#38BDF8"
            />
            <MacroRingItem
              label="Fats"
              emoji="🥑"
              current={totalFat}
              target={targetFat}
              color="#F97316"
            />
          </View>
        </Animated.View>

        {/* Real AI Scanner Action Buttons Card */}
        <View style={styles.aiActionCard}>
          <View style={styles.aiActionHeader}>
            <View style={styles.aiBadge}>
              <View style={styles.aiBadgeIconCircle}>
                <Ionicons name="camera" size={11} color="#14181B" />
              </View>
              <Text style={styles.aiBadgeText}>REAL AI VISION SCANNER</Text>
            </View>
          </View>

          <Text style={styles.aiActionTitle}>{t('snap_meal_photo')}</Text>

          <View style={styles.scanBtnRow}>
            {/* AI Photo Scan (Primary/Filled Active) */}
            <TouchableOpacity
              style={[styles.scanTabBtn, styles.scanTabPrimary]}
              onPress={handleAiPhotoScanChoice}
              activeOpacity={0.85}
            >
              <View style={styles.scanTabIconBoxPrimary}>
                <Ionicons name="camera-outline" size={18} color="#14181B" />
              </View>
              <Text style={styles.scanTabLabelPrimary}>{t('ai_photo_scan')}</Text>
              <Text style={styles.scanTabSubPrimary}>Recommended</Text>
            </TouchableOpacity>

            {/* Log Manuale (Neutral) */}
            <TouchableOpacity
              style={styles.scanTabBtn}
              onPress={() => setShowManualMealModal(true)}
              activeOpacity={0.85}
            >
              <View style={styles.scanTabIconBoxNeutral}>
                <Ionicons name="create-outline" size={17} color="#4B5259" />
              </View>
              <Text style={styles.scanTabLabelNeutral}>{t('manual_log')}</Text>
              <Text style={styles.scanTabSubNeutral}>Type it in</Text>
            </TouchableOpacity>

            {/* Barcode Scan (Neutral) */}
            <TouchableOpacity
              style={styles.scanTabBtn}
              onPress={() => {
                if (!isPro) {
                  setAdPurpose('barcode_scan');
                  setShowAdScanModal(true);
                } else {
                  setShowBarcodeModal(true);
                }
              }}
              activeOpacity={0.85}
            >
              <View style={styles.scanTabIconBoxNeutral}>
                <Ionicons name="barcode-outline" size={17} color="#4B5259" />
              </View>
              <Text style={styles.scanTabLabelNeutral}>{t('barcode_scan')}</Text>
              <Text style={styles.scanTabSubNeutral}>Packaged food</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Water Hydration Tracker Card */}
        <WaterTrackerCard />

        {/* 2-Grid Stats Widgets (Moved below Daily Hydration) */}
        <View style={styles.statsGridRow}>
          <View style={styles.statWidgetCard}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconBox, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="footsteps" size={16} color="#F97316" />
              </View>
              <Text style={styles.statWidgetTitle}>{t('step_walk')}</Text>
            </View>
            <Text style={styles.statWidgetBigNum}>5,500 <Text style={styles.statWidgetUnit}>{t('steps')}</Text></Text>
          </View>

          <View style={styles.statWidgetCard}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="water" size={16} color="#0EA5E9" />
              </View>
              <Text style={styles.statWidgetTitle}>Drink Water</Text>
            </View>
            <Text style={styles.statWidgetBigNum}>12 <Text style={styles.statWidgetUnit}>glass</Text></Text>
          </View>
        </View>

        {/* Intermittent Fasting Timer Card */}
        <FastingTimerCard onUnlockPro={() => openPaywall('fasting_timer')} />

        {/* Dynamic Interactive Calendar Strip */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeaderRow}>
            <TouchableOpacity
              style={styles.calNavBtn}
              onPress={() => {
                const prevWeek = new Date(selectedDate);
                prevWeek.setDate(prevWeek.getDate() - 7);
                setSelectedDate(prevWeek);
              }}
            >
              <Ionicons name="chevron-back" size={18} color="#0F172A" />
            </TouchableOpacity>

            <Text style={styles.monthTitleText}>
              {selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>

            <TouchableOpacity
              style={styles.calNavBtn}
              onPress={() => {
                const nextWeek = new Date(selectedDate);
                nextWeek.setDate(nextWeek.getDate() + 7);
                setSelectedDate(nextWeek);
              }}
            >
              <Ionicons name="chevron-forward" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.daysFlexRow}>
            {getWeekDays(selectedDate).map((dayObj, index) => {
              const dayLabel = dayObj.toLocaleDateString(undefined, { weekday: 'narrow' });
              const dateNum = dayObj.getDate().toString().padStart(2, '0');
              const isSelected = dayObj.toDateString() === selectedDate.toDateString();

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayColumnCard,
                    isSelected && styles.activeDayColumnCard,
                  ]}
                  onPress={() => setSelectedDate(dayObj)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayLabelText, isSelected && styles.activeDayText]}>
                    {dayLabel}
                  </Text>
                  <Text style={[styles.dateNumText, isSelected && styles.activeDateNumText]}>
                    {dateNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Today's / Selected Date's Logged Meals */}
        <View style={styles.mealsSection}>
          <Text style={styles.mealsSectionTitle}>
            {selectedDate.toDateString() === new Date().toDateString()
              ? "Today's Logged Meals"
              : `Logged Meals (${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`}
          </Text>

          {meals.map((meal) => (
            <TouchableOpacity
              key={meal.id}
              style={styles.mealCard}
              onPress={() => handleOpenMealDetail(meal)}
              activeOpacity={0.85}
            >
              <View style={styles.mealCardTop}>
                <View style={styles.mealCatLeft}>
                  <Ionicons name="restaurant-outline" size={18} color="#84CC16" />
                  <Text style={styles.mealCategoryTitle}>{meal.category}</Text>
                </View>
                <Text style={styles.mealKcalRange}>🔥 {meal.calories} kcal</Text>
              </View>

              <View style={styles.mealCardBody}>
                {meal.imageUri ? (
                  <Image source={{ uri: meal.imageUri }} style={styles.mealThumbImg} />
                ) : (
                  <View style={styles.mealPlaceholderBox}>
                    <Ionicons name="fast-food-outline" size={24} color="#84CC16" />
                  </View>
                )}
                <View style={styles.mealInfoCol}>
                  <Text style={styles.mealNameText}>{meal.name}</Text>
                  <Text style={styles.mealMacroText}>
                    Protein: {meal.protein}g • Carbs: {meal.carbs}g • Fat: {meal.fat}g
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.ScrollView>

      {/* Real AI Camera Vision Modal */}
      <Modal
        visible={showScannerModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowScannerModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeaderRow}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowScannerModal(false)}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>AI Vision Plate Scanner</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            {capturedImageUri && (
              <View style={styles.previewImageContainer}>
                <Image source={{ uri: capturedImageUri }} style={styles.previewMealImage} />
                <View style={styles.aiScanOverlayBadge}>
                  <Ionicons name="sparkles" size={14} color="#0F172A" />
                  <Text style={styles.aiScanOverlayText}>AI ANALYZING PLATE</Text>
                </View>
              </View>
            )}

            {isScanning ? (
              <View style={styles.scanningLoaderBox}>
                <ActivityIndicator size="large" color="#84CC16" />
                <Text style={styles.scanningText}>Identifying Food & Calculating Portion Macros...</Text>
                <Text style={styles.scanningSub}>Running vision classification model...</Text>
              </View>
            ) : scanResult ? (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#84CC16" />
                  <Text style={styles.resultDishName}>{scanResult.food_name}</Text>
                </View>

                {/* Weight & Item Count Badge */}
                <View style={{ backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'center', marginVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    ⚖️ Estimated Portion: {scanResult.estimated_weight_g || 150}g
                    {scanResult.item_count && scanResult.item_count > 1 ? ` (${scanResult.item_count} pcs × ${scanResult.unit_weight_g || Math.round(scanResult.estimated_weight_g / scanResult.item_count)}g/ea)` : ''}
                  </Text>
                </View>

                <View style={styles.calBigBox}>
                  <Text style={styles.resultCalNum}>{scanResult.calories}</Text>
                  <Text style={styles.resultKcalUnit}>Total Kcal</Text>
                </View>

                <View style={styles.macroSplitGrid}>
                  <View style={styles.macroCol}>
                    <Text style={styles.macroVal}>{scanResult.protein_g}g</Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                  <View style={styles.macroCol}>
                    <Text style={styles.macroVal}>{scanResult.carbs_g}g</Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.macroCol}>
                    <Text style={styles.macroVal}>{scanResult.fat_g}g</Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                </View>

                <View style={styles.insightBox}>
                  <View style={styles.insightHeader}>
                    <Ionicons name="bulb-outline" size={16} color="#84CC16" />
                    <Text style={styles.insightTitle}>AI Nutrition Coach Note</Text>
                  </View>
                  <Text style={styles.insightText}>{scanResult.insights}</Text>
                </View>

                <TouchableOpacity
                  style={styles.saveMealBtn}
                  onPress={handleSaveScannedMeal}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveMealBtnText}>Log Scanned Meal</Text>
                  <Ionicons name="arrow-forward" size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* API Key Configurator Modal */}
      <Modal
        visible={showApiKeyModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowApiKeyModal(false)}
      >
        <View style={styles.keyModalOverlay}>
          <View style={styles.keyModalCard}>
            <View style={styles.keyModalHeader}>
              <Ionicons name="key" size={20} color="#84CC16" />
              <Text style={styles.keyModalTitle}>AI Vision Key Configurator</Text>
            </View>
            <Text style={styles.keyModalSub}>
              Paste your Google Gemini Key (`AIzaSy...`) or OpenAI Key (`sk-...`) for 100% accurate AI Vision food plate recognition. Get a free Gemini key at aistudio.google.com!
            </Text>

            <TextInput
              style={styles.keyInput}
              placeholder="AIzaSy... or sk-proj-..."
              placeholderTextColor="#94A3B8"
              value={customApiKey}
              onChangeText={setCustomApiKey}
              secureTextEntry={false}
              autoCapitalize="none"
            />

            <View style={styles.keyModalActions}>
              <TouchableOpacity style={styles.keyCancelBtn} onPress={() => setShowApiKeyModal(false)}>
                <Text style={styles.keyCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.keySaveBtn}
                onPress={() => {
                  setShowApiKeyModal(false);
                  Alert.alert('Key Saved! 🔑', 'AI Vision key configured for instant food plate scans.');
                }}
              >
                <Text style={styles.keySaveText}>Save Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Meal Detail / Edit / Delete Modal */}
      <Modal
        visible={showDetailModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            {/* Header */}
            <View style={styles.detailHeaderRow}>
              <Text style={styles.detailTitleText}>
                {isEditingMeal ? 'Edit Meal Details' : 'Meal Details'}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.detailCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ paddingBottom: 10 }}>
              {selectedMealForDetail?.imageUri && (
                <Image source={{ uri: selectedMealForDetail.imageUri }} style={styles.detailHeroImage} />
              )}

              {isEditingMeal ? (
                <View style={styles.editFormBox}>
                  <Text style={styles.editLabel}>Meal / Food Name</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="e.g. Pasta Vongole"
                  />

                  <View style={styles.editRowGrid}>
                    <View style={styles.editGridCol}>
                      <Text style={styles.editLabel}>Calories (kcal)</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editCalories}
                        onChangeText={setEditCalories}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.editGridCol}>
                      <Text style={styles.editLabel}>Protein (g)</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editProtein}
                        onChangeText={setEditProtein}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.editRowGrid}>
                    <View style={styles.editGridCol}>
                      <Text style={styles.editLabel}>Carbs (g)</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editCarbs}
                        onChangeText={setEditCarbs}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.editGridCol}>
                      <Text style={styles.editLabel}>Fat (g)</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editFat}
                        onChangeText={setEditFat}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.editActionRow}>
                    <TouchableOpacity style={styles.saveEditBtn} onPress={handleSaveMealEdit}>
                      <Ionicons name="checkmark" size={18} color="#0F172A" />
                      <Text style={styles.saveEditBtnText}>Save Changes</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setIsEditingMeal(false)}>
                      <Text style={styles.cancelEditBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.detailBodyBox}>
                  <Text style={styles.detailFoodTitle}>{selectedMealForDetail?.name}</Text>
                  <Text style={styles.detailCategorySub}>Category: {selectedMealForDetail?.category} • {selectedMealForDetail?.time}</Text>

                  {/* 4 Macro Cards */}
                  <View style={styles.detailMacroGrid}>
                    <View style={styles.detailMacroBox}>
                      <Ionicons name="flame" size={18} color="#F97316" />
                      <Text style={styles.detailMacroVal}>{selectedMealForDetail?.calories} kcal</Text>
                      <Text style={styles.detailMacroLbl}>Energy</Text>
                    </View>

                    <View style={styles.detailMacroBox}>
                      <Ionicons name="fitness" size={18} color="#16A34A" />
                      <Text style={styles.detailMacroVal}>{selectedMealForDetail?.protein}g</Text>
                      <Text style={styles.detailMacroLbl}>Protein</Text>
                    </View>

                    <View style={styles.detailMacroBox}>
                      <Ionicons name="nutrition" size={18} color="#F97316" />
                      <Text style={styles.detailMacroVal}>{selectedMealForDetail?.carbs}g</Text>
                      <Text style={styles.detailMacroLbl}>Carbs</Text>
                    </View>

                    <View style={styles.detailMacroBox}>
                      <Ionicons name="pie-chart" size={18} color="#EF4444" />
                      <Text style={styles.detailMacroVal}>{selectedMealForDetail?.fat}g</Text>
                      <Text style={styles.detailMacroLbl}>Fat</Text>
                    </View>
                  </View>

                  {/* Action Buttons: Edit and Delete */}
                  <View style={styles.detailBtnRow}>
                    <TouchableOpacity style={styles.editMealBtn} onPress={() => setIsEditingMeal(true)} activeOpacity={0.85}>
                      <Ionicons name="create-outline" size={18} color="#0F172A" />
                      <Text style={styles.editMealBtnText}>Edit Meal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteMealBtn} onPress={handleDeleteMeal} activeOpacity={0.85}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      <Text style={styles.deleteMealBtnText}>Delete Meal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ProfileModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <NotificationModal visible={showNotifModal} onClose={() => setShowNotifModal(false)} />
      <AdScanModal visible={showAdScanModal} onAdCompleted={handleAdCompleted} onClose={() => setShowAdScanModal(false)} />
      <ManualMealModal
        visible={showManualMealModal}
        onClose={() => setShowManualMealModal(false)}
        onMealAdded={handleAddManualOrBarcodeMeal}
      />
      <BarcodeScannerModal
        visible={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        onMealAdded={handleAddManualOrBarcodeMeal}
      />
      <PaywallModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userProfileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#BEF264',
  },
  greetingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  guestLoginPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BEF264',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  guestLoginPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  guestBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BEF264',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  guestBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7FEE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestBannerTextCol: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  guestBannerSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  redBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  weeklyProgressHeroCard: {
    backgroundColor: '#D9F99D',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLeftCol: {
    flex: 1,
  },
  dailyIntakePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BEF264',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 10,
  },
  dailyIntakePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroWeeklyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: 6,
  },
  heroSubText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  gaugeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerCircleGauge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 6,
    borderColor: '#84CC16',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  innerCircleGauge: {
    alignItems: 'center',
  },
  gaugeDaysNum: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 26,
  },
  gaugeDaysLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statWidgetCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statWidgetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  statWidgetBigNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  statWidgetUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  aiActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E7E5DB',
    marginBottom: 20,
  },
  aiActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FACB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 8,
  },
  aiBadgeIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#9CC400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadgeText: {
    color: '#9CC400',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  keyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  keyBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  aiActionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#14181B',
    marginBottom: 18,
    lineHeight: 25,
  },
  scanBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scanTabBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#F3F2EA',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  scanTabPrimary: {
    backgroundColor: '#C8F31D',
    borderColor: '#9CC400',
  },
  scanTabIconBoxPrimary: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(20, 24, 27, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTabIconBoxNeutral: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E7E5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTabLabelPrimary: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#14181B',
    textAlign: 'center',
    lineHeight: 15,
  },
  scanTabLabelNeutral: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#14181B',
    textAlign: 'center',
    lineHeight: 15,
  },
  scanTabSubPrimary: {
    fontSize: 9.5,
    fontWeight: '600',
    color: 'rgba(20, 24, 27, 0.65)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scanTabSubNeutral: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#9A9F95',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  calendarSection: {
    marginBottom: 20,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calNavBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  daysFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumnCard: {
    width: 44,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeDayColumnCard: {
    backgroundColor: '#BEF264',
    borderColor: '#BEF264',
  },
  dayLabelText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  activeDayText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  dateNumText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '800',
  },
  activeDateNumText: {
    color: '#0F172A',
  },
  mealsSection: {
    gap: 12,
  },
  mealsSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mealCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealCatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealCategoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  mealKcalRange: {
    fontSize: 12,
    fontWeight: '800',
    color: '#84CC16',
  },
  mealCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealThumbImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  mealPlaceholderBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F7FEE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealInfoCol: {
    flex: 1,
  },
  mealNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  mealMacroText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  previewImageContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewMealImage: {
    width: '100%',
    height: 220,
    borderRadius: 20,
  },
  aiScanOverlayBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#BEF264',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiScanOverlayText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
  },
  scanningLoaderBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
    textAlign: 'center',
  },
  scanningSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  resultDishName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  calBigBox: {
    backgroundColor: '#F7FEE7',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCalNum: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0F172A',
  },
  resultKcalUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: '#84CC16',
  },
  macroSplitGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  macroCol: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  macroLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  insightBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#84CC16',
  },
  insightText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  saveMealBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveMealBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  keyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  keyModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  keyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  keyModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  keyModalSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  keyInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  keyModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  keyCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  keyCancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  keySaveBtn: {
    backgroundColor: '#BEF264',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  keySaveText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '85%',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailCloseBtn: {
    padding: 4,
  },
  detailHeroImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 14,
  },
  detailBodyBox: {
    gap: 12,
  },
  detailFoodTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailCategorySub: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 4,
  },
  detailMacroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 6,
  },
  detailMacroBox: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailMacroVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  detailMacroLbl: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  detailBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  editMealBtn: {
    flex: 1,
    backgroundColor: '#BEF264',
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editMealBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  deleteMealBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteMealBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  editFormBox: {
    gap: 10,
  },
  editLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  editInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  editRowGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  editGridCol: {
    flex: 1,
    gap: 4,
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  saveEditBtn: {
    flex: 1,
    backgroundColor: '#BEF264',
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveEditBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cancelEditBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  cancelEditBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  macroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  macroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  macroTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  macroIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F7FEE7',
    borderWidth: 1,
    borderColor: '#BEF264',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  macroCardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  macroRingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  macroRingCardItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroRingVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'sans-serif-bold',
  },
  macroRingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 2,
  },
  macroRingSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  macroRingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  macroRingBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
});
