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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { PaywallModal } from '@/components/PaywallModal';
import { SupabaseService, ExpoGoSafeAsyncStorage, generateUUID } from '@/services/supabaseService';
import { ProfileModal } from '@/components/ProfileModal';
import { NotificationModal } from '@/components/NotificationModal';
import { analyzeMealPlateImage } from '@/services/aiVisionService';
import { AdScanModal } from '@/components/AdScanModal';
import { ManualMealModal } from '@/components/ManualMealModal';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { WaterTrackerCard } from '@/components/WaterTrackerCard';
import { FastingTimerCard } from '@/components/FastingTimerCard';
import { AdBanner } from '@/components/AdBanner';
import { WeeklyCalendarStrip } from '@/components/WeeklyCalendarStrip';
import { CalorieProgressRing } from '@/components/CalorieProgressRing';
import { QuickLogModal } from '@/components/QuickLogModal';
import { FoodSearchModal, FoodItem } from '@/components/FoodSearchModal';
import { AINutritionResultModal, ScannedNutritionData } from '@/components/AINutritionResultModal';
import { ScanViewfinderOverlay } from '@/components/ScanViewfinderOverlay';
import { PhotoChoiceModal } from '@/components/PhotoChoiceModal';
import { MealCategoryDetailModal } from '@/components/MealCategoryDetailModal';

export interface LoggedMeal {
  id: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weightG?: number;
  baseWeightG?: number;
  baseCalories?: number;
  baseProtein?: number;
  baseCarbs?: number;
  baseFat?: number;
  portion?: string;
  imageUri?: string;
  time: string;
  emoji?: string;
  fiber_g?: number;
  sugar_g?: number;
  saturated_fat_g?: number;
  sodium_mg?: number;
  potassium_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  vitamin_c_mg?: number;
  vitamin_d_iu?: number;
  vitamin_a_iu?: number;
  vitamin_b12_mcg?: number;
  magnesium_mg?: number;
  zinc_mg?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    user,
    isPro,
    freeUsageCount,
    maxFreeUsage,
    recordUsage,
    openPaywall,
    targetCalories,
    biometrics,
    beginWrite,
    endWrite,
    hasCompletedOnboarding,
    isLoaded,
    isHealthSyncEnabled,
    includeBurnedInBudget,
    burnedCaloriesToday,
    stepsToday,
    exerciseMinutesToday,
    lastHealthSyncTime,
    healthSyncStatus,
    dailyActivitiesByDate,
    getActivityForDate,
    getActivityForDateSync,
    triggerHealthSync,
    updateWaterIntake,
  } = useSubscription();
  const { t } = useLanguage();
  const { isDarkMode, colors } = useTheme();

  useEffect(() => {
    if (isLoaded && !hasCompletedOnboarding) {
      router.replace('/onboarding' as any);
    }
  }, [isLoaded, hasCompletedOnboarding]);

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

  const getFoodEmoji = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('pizza')) return '🍕';
    if (lower.includes('burger')) return '🍔';
    if (lower.includes('hotdog') || lower.includes('sausage')) return '🌭';
    if (lower.includes('salad')) return '🥗';
    if (lower.includes('sandwich') || lower.includes('toast') || lower.includes('avocado')) return '🥪';
    if (lower.includes('pasta') || lower.includes('spaghetti')) return '🍝';
    if (lower.includes('sushi')) return '🍣';
    if (lower.includes('steak') || lower.includes('meat') || lower.includes('beef')) return '🥩';
    if (lower.includes('chicken') || lower.includes('poultry')) return '🍗';
    if (lower.includes('egg') || lower.includes('omelet')) return '🍳';
    if (lower.includes('apple') || lower.includes('fruit')) return '🍏';
    if (lower.includes('coffee') || lower.includes('tea')) return '☕';
    if (lower.includes('donut') || lower.includes('dessert') || lower.includes('cake')) return '🍩';
    return '🍽️';
  };

  useEffect(() => {
    loadMealsForDate(selectedDate);
    getActivityForDate(selectedDateKey);
  }, [user, selectedDateKey]);

  const loadMealsForDate = async (targetDate: Date) => {
    const key = getDateKey(targetDate);
    const guestKey = `@mealpulse_guest_meals_v1_${key}`;

    // Read local cache first
    let localList: LoggedMeal[] = [];
    const savedGuest = await ExpoGoSafeAsyncStorage.getItem(guestKey);
    if (savedGuest) {
      try {
        localList = JSON.parse(savedGuest);
      } catch {}
    }

    if (user?.id) {
      try {
        const cloudLogs = await SupabaseService.fetchMealLogsByUserAndDate(user.id, key);
        if (cloudLogs && cloudLogs.length > 0) {
          const mapped: LoggedMeal[] = cloudLogs.map((m) => {
            const existingLocal = localList.find((l) => l.id === m.id);
            const curWeight = Number(m.estimated_weight_g || existingLocal?.weightG || 100);
            const bWeight = existingLocal?.baseWeightG || 100;
            const ratio = curWeight > 0 ? bWeight / curWeight : 1;
            const bCal = existingLocal?.baseCalories || Math.round(Number(m.calories || 0) * ratio);
            const bProt = existingLocal?.baseProtein !== undefined ? existingLocal.baseProtein : Math.round(Number(m.protein_g || 0) * ratio * 10) / 10;
            const bCarb = existingLocal?.baseCarbs !== undefined ? existingLocal.baseCarbs : Math.round(Number(m.carbs_g || 0) * ratio * 10) / 10;
            const bFat = existingLocal?.baseFat !== undefined ? existingLocal.baseFat : Math.round(Number(m.fat_g || 0) * ratio * 10) / 10;

            return {
              id: m.id,
              category: (m.meal_type?.toLowerCase() as any) || 'dinner',
              name: m.food_name,
              brand: existingLocal?.brand,
              calories: Number(m.calories || 0),
              protein: Number(m.protein_g || 0),
              carbs: Number(m.carbs_g || 0),
              fat: Number(m.fat_g || 0),
              weightG: curWeight,
              baseWeightG: bWeight,
              baseCalories: bCal,
              baseProtein: bProt,
              baseCarbs: bCarb,
              baseFat: bFat,
              portion: existingLocal?.portion || `${curWeight}g`,
              imageUri: m.image_url || existingLocal?.imageUri,
              emoji: existingLocal?.emoji || getFoodEmoji(m.food_name),
              time: m.logged_at
                ? new Date(m.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : existingLocal?.time || 'Today',
              fiber_g: existingLocal?.fiber_g,
              sugar_g: existingLocal?.sugar_g,
              saturated_fat_g: existingLocal?.saturated_fat_g,
              sodium_mg: existingLocal?.sodium_mg,
              potassium_mg: existingLocal?.potassium_mg,
              calcium_mg: existingLocal?.calcium_mg,
              iron_mg: existingLocal?.iron_mg,
              vitamin_c_mg: existingLocal?.vitamin_c_mg,
              vitamin_d_iu: existingLocal?.vitamin_d_iu,
              vitamin_a_iu: existingLocal?.vitamin_a_iu,
              vitamin_b12_mcg: existingLocal?.vitamin_b12_mcg,
              magnesium_mg: existingLocal?.magnesium_mg,
              zinc_mg: existingLocal?.zinc_mg,
            };
          });
          setMealsByDate((prev) => ({ ...prev, [key]: mapped }));
          await ExpoGoSafeAsyncStorage.setItem(guestKey, JSON.stringify(mapped));
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch error, fallback to local storage:', err);
      }
    }

    setMealsByDate((prev) => ({
      ...prev,
      [key]: localList,
    }));
  };

  // Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [showFoodSearchModal, setShowFoodSearchModal] = useState(false);
  const [showPhotoChoiceModal, setShowPhotoChoiceModal] = useState(false);
  const [activeMealType, setActiveMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [showAINutritionResultModal, setShowAINutritionResultModal] = useState(false);
  const [scannedNutritionData, setScannedNutritionData] = useState<ScannedNutritionData | null>(null);

  // Category Detail Modal State (shows full list of items in category)
  const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(null);
  const [showCategoryDetailModal, setShowCategoryDetailModal] = useState(false);

  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showAdScanModal, setShowAdScanModal] = useState(false);
  const [showManualMealModal, setShowManualMealModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [customApiKey, setCustomApiKey] = useState('');
  const [adPurpose, setAdPurpose] = useState<'ai_scan' | 'barcode_scan' | null>('ai_scan');

  // Calculations
  const totalCalories = Math.round(meals.reduce((acc, m) => acc + (m.calories || 0), 0));
  const totalProtein = Math.round(meals.reduce((acc, m) => acc + (m.protein || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(meals.reduce((acc, m) => acc + (m.carbs || 0), 0) * 10) / 10;
  const totalFat = Math.round(meals.reduce((acc, m) => acc + (m.fat || 0), 0) * 10) / 10;

  const targetCal = targetCalories || 2000;
  const currentDayActivity = getActivityForDateSync(selectedDateKey);
  const burnedCal = Math.round(currentDayActivity.activeCalories || 0);
  const currentDaySteps = Math.round(currentDayActivity.steps || 0);
  const carbLeft = Math.max(0, Math.round((250 - totalCarbs) * 10) / 10);
  const proteinLeft = Math.max(0, Math.round((140 - totalProtein) * 10) / 10);
  const fatLeft = Math.max(0, Math.round((70 - totalFat) * 10) / 10);

  // Group meals by category
  const mealsByCategory = {
    breakfast: meals.filter(m => m.category.toLowerCase().includes('breakfast')),
    lunch: meals.filter(m => m.category.toLowerCase().includes('lunch')),
    dinner: meals.filter(m => m.category.toLowerCase().includes('dinner')),
    snack: meals.filter(m => m.category.toLowerCase().includes('snack')),
  };

  const mealBudgets = {
    breakfast: {
      current: mealsByCategory.breakfast.reduce((acc, m) => acc + m.calories, 0),
      target: 450,
      title: t('meal_breakfast'),
      emoji: '🥐',
      bgTint: colors.breakfastTint,
    },
    lunch: {
      current: mealsByCategory.lunch.reduce((acc, m) => acc + m.calories, 0),
      target: 600,
      title: t('meal_lunch'),
      emoji: '🥗',
      bgTint: colors.lunchTint,
    },
    dinner: {
      current: mealsByCategory.dinner.reduce((acc, m) => acc + m.calories, 0),
      target: 650,
      title: t('meal_dinner'),
      emoji: '🥩',
      bgTint: colors.dinnerTint,
    },
    snack: {
      current: mealsByCategory.snack.reduce((acc, m) => acc + m.calories, 0),
      target: 300,
      title: t('meal_snack'),
      emoji: '🍏',
      bgTint: colors.snackTint,
    },
  };

  const recordGuestDate = async (dateKey: string) => {
    try {
      const datesKey = '@mealpulse_all_guest_dates_v1';
      const raw = await ExpoGoSafeAsyncStorage.getItem(datesKey);
      const dates: string[] = raw ? JSON.parse(raw) : [];
      if (!dates.includes(dateKey)) {
        dates.push(dateKey);
        await ExpoGoSafeAsyncStorage.setItem(datesKey, JSON.stringify(dates));
      }
    } catch {}
  };

  const handleOpenFoodSearch = (type: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setActiveMealType(type);
    setShowFoodSearchModal(true);
  };

  const handleOpenCategoryDetail = async (type: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    // Quick refresh to ensure latest Supabase cloud sync
    await loadMealsForDate(selectedDate);
    setSelectedCategoryForDetail(type);
    setShowCategoryDetailModal(true);
  };

  const handleAddFoodsFromCatalog = async (foodList: FoodItem[]) => {
    beginWrite();
    try {
      const currentKey = getDateKey(selectedDate);
      const newLoggedMeals: LoggedMeal[] = foodList.map(item => ({
        id: generateUUID(),
        category: activeMealType,
        name: item.name,
        brand: item.brand,
        calories: item.calories,
        protein: item.proteinG || 0,
        carbs: item.carbsG || 0,
        fat: item.fatG || 0,
        weightG: item.weightG || 100,
        baseWeightG: item.baseWeightG || item.weightG || 100,
        baseCalories: item.baseCalories !== undefined ? item.baseCalories : item.calories,
        baseProtein: item.baseProteinG !== undefined ? item.baseProteinG : (item.proteinG || 0),
        baseCarbs: item.baseCarbsG !== undefined ? item.baseCarbsG : (item.carbsG || 0),
        baseFat: item.baseFatG !== undefined ? item.baseFatG : (item.fatG || 0),
        portion: item.portion,
        emoji: item.emoji,
        imageUri: item.imageUrl,
        fiber_g: item.fiberG,
        sugar_g: item.sugarG,
        saturated_fat_g: item.saturatedFatG,
        sodium_mg: item.sodiumMg,
        potassium_mg: item.potassiumMg,
        calcium_mg: item.calciumMg,
        iron_mg: item.ironMg,
        vitamin_c_mg: item.vitaminCMg,
        vitamin_d_iu: item.vitaminDIU,
        vitamin_a_iu: item.vitaminAIU,
        vitamin_b12_mcg: item.vitaminB12Mcg,
        magnesium_mg: item.magnesiumMg,
        zinc_mg: item.zincMg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

      const updatedList = [...newLoggedMeals, ...(mealsByDate[currentKey] || [])];
      setMealsByDate((prev) => ({
        ...prev,
        [currentKey]: updatedList,
      }));

      // 1. Always persist to local safe storage
      const guestKey = `@mealpulse_guest_meals_v1_${currentKey}`;
      await ExpoGoSafeAsyncStorage.setItem(guestKey, JSON.stringify(updatedList));
      await recordGuestDate(currentKey);

      // 2. Persist to Supabase if authenticated
      if (user?.id) {
        for (const m of newLoggedMeals) {
          await SupabaseService.saveMealLog({
            id: m.id,
            user_id: user.id,
            food_name: m.name,
            estimated_weight_g: m.weightG || 100,
            calories: m.calories,
            protein_g: m.protein,
            carbs_g: m.carbs,
            fat_g: m.fat,
            meal_type: activeMealType,
            logging_method: 'manual',
          });
        }
      }
    } finally {
      endWrite();
    }
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
      quality: 0.4,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
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
      quality: 0.4,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      triggerScanFlow(result.assets[0].base64 || '', result.assets[0].uri);
    }
  };

  const handleAiPhotoScanChoice = () => {
    setShowPhotoChoiceModal(true);
  };

  const triggerScanFlow = (base64: string, imageUri: string) => {
    setCapturedImageUri(imageUri);
    setPendingBase64(base64);
    setAdPurpose('ai_scan');

    if (!isPro) {
      setShowAdScanModal(true);
    } else {
      setShowScannerModal(true);
      runAiAnalysis(base64);
    }
  };

  const handleAdCompleted = () => {
    setShowAdScanModal(false);
    const purpose = adPurpose;
    const b64 = pendingBase64;
    setAdPurpose(null);
    setPendingBase64(null);

    if (purpose === 'barcode_scan') {
      setShowBarcodeModal(true);
    } else if (b64) {
      setShowScannerModal(true);
      runAiAnalysis(b64);
    }
  };

  const handleCancelScanning = () => {
    setIsScanning(false);
    setShowScannerModal(false);
    setPendingBase64(null);
    setCapturedImageUri(null);
  };

  const runAiAnalysis = async (base64: string) => {
    setIsScanning(true);
    try {
      const result = await analyzeMealPlateImage(base64, customApiKey);
      setIsScanning(false);
      setShowScannerModal(false);

      const parsedGrade: 'A' | 'B' | 'C' | 'D' =
        typeof result.health_score === 'string' && ['A', 'B', 'C', 'D'].includes(result.health_score)
          ? (result.health_score as any)
          : 'B';

      setScannedNutritionData({
        food_name: result.food_name,
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        estimated_weight_g: result.estimated_weight_g || 150,
        item_count: result.item_count || 1,
        unit_weight_g: result.unit_weight_g || 150,
        insights: result.insights,
        health_score: parsedGrade,
        image_uri: capturedImageUri || undefined,
      });

      setShowAINutritionResultModal(true);
    } catch (err: any) {
      setIsScanning(false);
      setShowScannerModal(false);
      Alert.alert('Scan Result', err.message || 'Could not analyze food plate.');
    }
  };

  const getAutoMealCategory = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 18) return 'snack';
    return 'dinner';
  };

  const handleConfirmScannedMeal = async (finalData: ScannedNutritionData & { servingMultiplier: number }) => {
    beginWrite();
    try {
      const targetCategory = (activeMealType || getAutoMealCategory()).toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack';
      const mealId = generateUUID();
      const currentKey = getDateKey(selectedDate);
      const newMeal: LoggedMeal = {
        id: mealId,
        category: targetCategory,
        name: finalData.food_name,
        calories: finalData.calories,
        protein: finalData.protein_g,
        carbs: finalData.carbs_g,
        fat: finalData.fat_g,
        weightG: finalData.estimated_weight_g || 100,
        baseWeightG: 100,
        baseCalories: Math.round((finalData.calories / (finalData.estimated_weight_g || 100)) * 100),
        baseProtein: Math.round(((finalData.protein_g || 0) / (finalData.estimated_weight_g || 100)) * 100 * 10) / 10,
        baseCarbs: Math.round(((finalData.carbs_g || 0) / (finalData.estimated_weight_g || 100)) * 100 * 10) / 10,
        baseFat: Math.round(((finalData.fat_g || 0) / (finalData.estimated_weight_g || 100)) * 100 * 10) / 10,
        portion: `${finalData.estimated_weight_g || 100}g`,
        imageUri: finalData.image_uri,
        emoji: getFoodEmoji(finalData.food_name),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedList = [newMeal, ...(mealsByDate[currentKey] || [])];
      setMealsByDate((prev) => ({
        ...prev,
        [currentKey]: updatedList,
      }));

      // 1. Always persist to local safe storage
      const guestKey = `@mealpulse_guest_meals_v1_${currentKey}`;
      await ExpoGoSafeAsyncStorage.setItem(guestKey, JSON.stringify(updatedList));
      await recordGuestDate(currentKey);

      // 2. Persist to Supabase if authenticated
      if (user?.id) {
        await SupabaseService.saveMealLog({
          id: mealId,
          user_id: user.id,
          food_name: finalData.food_name,
          estimated_weight_g: finalData.estimated_weight_g,
          calories: finalData.calories,
          protein_g: finalData.protein_g,
          carbs_g: finalData.carbs_g,
          fat_g: finalData.fat_g,
          meal_type: targetCategory,
          image_url: finalData.image_uri,
          logging_method: 'ai_photo',
          health_score: finalData.health_score === 'A' ? 95 : finalData.health_score === 'B' ? 85 : 70,
          ai_insights: finalData.insights,
        });
      }

      setShowAINutritionResultModal(false);
      setScannedNutritionData(null);
      setCapturedImageUri(null);
    } finally {
      endWrite();
    }
  };

  const handleUpdateMeal = async (updatedMeal: LoggedMeal) => {
    beginWrite();
    try {
      const key = selectedDateKey;
      const currentList = mealsByDate[key] || [];
      const updatedList = currentList.map((m) => (m.id === updatedMeal.id ? updatedMeal : m));

      setMealsByDate((prev) => ({
        ...prev,
        [key]: updatedList,
      }));

      // 1. Update local storage
      const guestKey = `@mealpulse_guest_meals_v1_${key}`;
      await ExpoGoSafeAsyncStorage.setItem(guestKey, JSON.stringify(updatedList));

      // 2. Update Supabase if authenticated
      if (user?.id && updatedMeal.id) {
        await SupabaseService.saveMealLog({
          id: updatedMeal.id,
          user_id: user.id,
          food_name: updatedMeal.name,
          estimated_weight_g: updatedMeal.weightG || 100,
          calories: updatedMeal.calories,
          protein_g: updatedMeal.protein,
          carbs_g: updatedMeal.carbs,
          fat_g: updatedMeal.fat,
          meal_type: updatedMeal.category,
          image_url: updatedMeal.imageUri,
          logging_method: 'manual_edit',
        });
      }
    } finally {
      endWrite();
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    const key = selectedDateKey;
    const updatedList = (mealsByDate[key] || []).filter((m) => m.id !== mealId);

    setMealsByDate((prev) => ({
      ...prev,
      [key]: updatedList,
    }));

    // Update local storage
    const guestKey = `@mealpulse_guest_meals_v1_${key}`;
    await ExpoGoSafeAsyncStorage.setItem(guestKey, JSON.stringify(updatedList));

    // Delete from Supabase
    if (user?.id && mealId) {
      await SupabaseService.deleteMealLog(mealId);
    }
  };

  const handleAddManualMeal = (meal: { name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    handleAddFoodsFromCatalog([
      {
        id: generateUUID(),
        name: meal.name,
        calories: meal.calories,
        portion: '1 portion',
        weightG: 100,
        emoji: '🍽️',
        proteinG: meal.protein,
        carbsG: meal.carbs,
        fatG: meal.fat,
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.avatarBtn, { borderColor: colors.lime, borderWidth: 1.5 }]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowProfileModal(true);
            }}
            activeOpacity={0.8}
          >
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text style={[styles.headerGreeting, { color: colors.textSecondary }]}>
              {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'},
            </Text>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{userName}</Text>
          </View>

          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              style={[styles.iconCircleBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowNotifModal(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={19} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconCircleBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowProfileModal(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-horizontal" size={19} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly Calendar Day Strip */}
        <WeeklyCalendarStrip
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d)}
        />

        {/* Hero Calorie & Macro Card */}
        <CalorieProgressRing
          eatenCalories={totalCalories}
          burnedCalories={burnedCal}
          targetCalories={targetCal}
          carbLeft={carbLeft}
          proteinLeft={proteinLeft}
          fatLeft={fatLeft}
          includeBurnedInBudget={includeBurnedInBudget}
        />

        {/* Native Health & Wearable Activity Bar */}
        {(isHealthSyncEnabled || burnedCal > 0 || currentDaySteps > 0) && (
          <View style={[styles.activityBarCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <View style={styles.activityStatItem}>
              <View style={[styles.activityIconCircle, { backgroundColor: 'rgba(255, 107, 74, 0.15)' }]}>
                <Ionicons name="flame" size={15} color={colors.coral} />
              </View>
              <View>
                <Text style={[styles.activityStatVal, { color: colors.textPrimary }]}>{burnedCal} kcal</Text>
                <Text style={[styles.activityStatLabel, { color: colors.textSecondary }]}>{t('active_burned')}</Text>
              </View>
            </View>

            <View style={[styles.activityDivider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.activityStatItem}>
              <View style={[styles.activityIconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Ionicons name="footsteps" size={15} color={colors.sky} />
              </View>
              <View>
                <Text style={[styles.activityStatVal, { color: colors.textPrimary }]}>{currentDaySteps > 0 ? currentDaySteps.toLocaleString() : '0'}</Text>
                <Text style={[styles.activityStatLabel, { color: colors.textSecondary }]}>{t('steps_unit')}</Text>
              </View>
            </View>

            <View style={[styles.activityDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={[styles.activitySyncBtn, { backgroundColor: colors.limeGlow }]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                triggerHealthSync(selectedDateKey);
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={healthSyncStatus === 'syncing' ? 'sync' : 'refresh'}
                size={14}
                color={colors.lime}
              />
              <Text style={[styles.activitySyncBtnText, { color: colors.lime }]}>
                {healthSyncStatus === 'syncing' ? '...' : t('sync_short')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AdMob Banner (Disappears for PRO users) */}
        <AdBanner location="home_page" />

        {/* "Daily" Stacked Meal Cards Section */}
        <View style={styles.dailySection}>
          <View style={styles.dailyHeaderRow}>
            <Text style={[styles.dailyHeading, { color: colors.textPrimary }]}>{t('daily_section_title')}</Text>
            <TouchableOpacity
              style={styles.quickAddPlusBtn}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowQuickLogModal(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={28} color={colors.lime} />
            </TouchableOpacity>
          </View>

          {/* Meal Category Cards: Breakfast, Lunch, Dinner, Snack */}
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((catKey) => {
            const config = mealBudgets[catKey];
            const catMeals = mealsByCategory[catKey];
            const namesSummary = catMeals.length > 0
              ? catMeals.map(m => m.name).join(', ')
              : t('tap_to_log_food');

            const pct = Math.min(100, Math.round((config.current / config.target) * 100));

            return (
              <TouchableOpacity
                key={catKey}
                style={[
                  styles.dailyMealCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (catMeals.length > 0) {
                    handleOpenCategoryDetail(catKey);
                  } else {
                    handleOpenFoodSearch(catKey);
                  }
                }}
                activeOpacity={0.85}
              >
                <View style={styles.dailyMealLeft}>
                  <Text style={[styles.dailyMealTitle, { color: colors.textPrimary }]}>
                    {config.title}
                  </Text>
                  <Text
                    style={[styles.dailyMealSubtitle, { color: catMeals.length > 0 ? colors.textPrimary : colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {namesSummary}
                  </Text>

                  {/* Calories Progress & Bar */}
                  <View style={styles.calProgressRow}>
                    <Text style={[styles.calProgressText, { color: colors.textSecondary }]}>
                      {config.current} <Text style={{ color: colors.textMuted }}>/ {config.target} {t('kcal')}</Text>
                    </Text>
                    <View style={[styles.calProgressBarTrack, { backgroundColor: isDarkMode ? '#283144' : '#E2E8F0' }]}>
                      <View
                        style={[
                          styles.calProgressBarFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: catKey === 'breakfast' ? colors.coral : catKey === 'lunch' ? colors.emerald : catKey === 'dinner' ? colors.amber : colors.lime,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* 3D/Emoji Food Visual & Quick Add */}
                <View style={styles.dailyMealRight}>
                  <View style={[styles.foodVisualBox, { backgroundColor: config.bgTint, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                    <Text style={{ fontSize: 34 }}>{config.emoji}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.miniPlusBtn, { backgroundColor: colors.lime }]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleOpenFoodSearch(catKey);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={16} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Integrated Utilities: Water Tracker & Fasting Timer */}
        <WaterTrackerCard selectedDate={selectedDate} />
        <FastingTimerCard onUnlockPro={openPaywall} />
      </ScrollView>

      {/* Floating Log Modal (2x2 Grid) */}
      <QuickLogModal
        visible={showQuickLogModal}
        onClose={() => setShowQuickLogModal(false)}
        onSelectMeal={(type) => handleOpenFoodSearch(type)}
        onLogWater={(amount) => updateWaterIntake(amount, selectedDateKey)}
        mealBudgets={mealBudgets}
      />

      {/* Food Search & Quick Add Catalog */}
      <FoodSearchModal
        visible={showFoodSearchModal}
        mealType={activeMealType}
        onClose={() => setShowFoodSearchModal(false)}
        onSelectScanAI={handleAiPhotoScanChoice}
        onAddFoods={handleAddFoodsFromCatalog}
      />

      {/* Custom Theme AI Photo Choice Modal */}
      <PhotoChoiceModal
        visible={showPhotoChoiceModal}
        onClose={() => setShowPhotoChoiceModal(false)}
        onTakePhoto={handleLaunchCamera}
        onChooseGallery={handleLaunchGallery}
      />

      {/* AI Nutrition Result Modal (Grade Score & Macros) */}
      <AINutritionResultModal
        visible={showAINutritionResultModal}
        data={scannedNutritionData}
        onClose={() => setShowAINutritionResultModal(false)}
        onConfirm={handleConfirmScannedMeal}
      />

      {/* Full Category Meals List Detail Modal (Shows ALL meals in category with delete & add) */}
      <MealCategoryDetailModal
        visible={showCategoryDetailModal}
        category={selectedCategoryForDetail}
        meals={selectedCategoryForDetail ? mealsByCategory[selectedCategoryForDetail] : []}
        targetCalories={selectedCategoryForDetail ? mealBudgets[selectedCategoryForDetail].target : 500}
        onClose={() => setShowCategoryDetailModal(false)}
        onDeleteMeal={handleDeleteMeal}
        onUpdateMeal={handleUpdateMeal}
        onAddMore={(cat) => handleOpenFoodSearch(cat)}
      />

      {/* Scanning In Progress Overlay Modal with Dismiss / Close Support */}
      <Modal visible={showScannerModal} transparent animationType="fade" onRequestClose={handleCancelScanning}>
        <View style={styles.scannerModalBackdrop}>
          <ScanViewfinderOverlay isScanning={isScanning} onClose={handleCancelScanning} />
        </View>
      </Modal>

      {/* Core Modals */}
      <ProfileModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <NotificationModal visible={showNotifModal} onClose={() => setShowNotifModal(false)} />
      <AdScanModal visible={showAdScanModal} onAdCompleted={handleAdCompleted} onClose={() => setShowAdScanModal(false)} />
      <ManualMealModal visible={showManualMealModal} onClose={() => setShowManualMealModal(false)} onMealAdded={handleAddManualMeal} />
      <BarcodeScannerModal visible={showBarcodeModal} onClose={() => setShowBarcodeModal(false)} onMealAdded={handleAddManualMeal} />
      <PaywallModal />
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
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  headerTitleGroup: {
    flex: 1,
    marginLeft: 12,
  },
  headerGreeting: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  headerRightGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailySection: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  dailyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyHeading: {
    fontSize: 19,
    fontWeight: '900',
  },
  quickAddPlusBtn: {
    padding: 2,
  },
  dailyMealCard: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyMealLeft: {
    flex: 1,
    paddingRight: 12,
  },
  dailyMealTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  dailyMealSubtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 10,
  },
  calProgressRow: {
    gap: 5,
  },
  calProgressText: {
    fontSize: 12,
    fontWeight: '800',
  },
  calProgressBarTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  calProgressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  dailyMealRight: {
    alignItems: 'center',
    position: 'relative',
  },
  foodVisualBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlusBtn: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  scannerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  activityStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityStatVal: {
    fontSize: 13,
    fontWeight: '900',
  },
  activityStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  activityDivider: {
    width: 1,
    height: 22,
  },
  activitySyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  activitySyncBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
});
