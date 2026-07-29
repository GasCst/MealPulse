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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSubscription } from '@/context/SubscriptionContext';
import { Colors } from '@/constants/theme';
import { PaywallModal } from '@/components/PaywallModal';
import { SupabaseService } from '@/services/supabaseService';
import { ProfileModal } from '@/components/ProfileModal';
import { NotificationModal } from '@/components/NotificationModal';
import { analyzeMealPlateImage, MealVisionResult } from '@/services/aiVisionService';

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
  const { user, isPro, freeUsageCount, maxFreeUsage, recordUsage, openPaywall } = useSubscription();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest User';
  const avatarUrl = user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  const [meals, setMeals] = useState<LoggedMeal[]>([]);

  useEffect(() => {
    loadTodayMealsFromCloud();
  }, [user]);

  const loadTodayMealsFromCloud = async () => {
    if (!user?.id) {
      setMeals([]);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const cloudLogs = await SupabaseService.fetchMealLogsByUserAndDate(user.id, todayStr);

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
      setMeals(mapped);
    } else {
      setMeals([]);
    }
  };

  // Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<MealVisionResult | null>(null);

  // Custom API Key modal state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');

  // Calculate Totals
  const totalCalories = meals.reduce((acc, m) => acc + m.calories, 0);
  const targetCalories = 1920;

  const handleLaunchCamera = async () => {
    const allowed = recordUsage();
    if (!allowed) return;

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
      setCapturedImageUri(result.assets[0].uri);
      setShowScannerModal(true);
      runAiAnalysis(result.assets[0].base64 || '');
    }
  };

  const handleLaunchGallery = async () => {
    const allowed = recordUsage();
    if (!allowed) return;

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
      setCapturedImageUri(result.assets[0].uri);
      setShowScannerModal(true);
      runAiAnalysis(result.assets[0].base64 || '');
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

    const newMeal: LoggedMeal = {
      id: Date.now().toString(),
      category: 'Dinner',
      name: scanResult.food_name,
      calories: scanResult.calories,
      protein: scanResult.protein_g,
      carbs: scanResult.carbs_g,
      fat: scanResult.fat_g,
      imageUri: capturedImageUri || undefined,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Save to local UI state
    setMeals((prev) => [newMeal, ...prev]);

    // Save to Supabase Cloud DB per user account
    if (user?.id) {
      await SupabaseService.saveMealLog({
        user_id: user.id,
        food_name: scanResult.food_name,
        estimated_weight_g: scanResult.estimated_weight_g,
        calories: scanResult.calories,
        protein_g: scanResult.protein_g,
        carbs_g: scanResult.carbs_g,
        fat_g: scanResult.fat_g,
        meal_type: 'Dinner',
        image_url: capturedImageUri || undefined,
      });
      await loadTodayMealsFromCloud();
    }

    setShowScannerModal(false);
    setCapturedImageUri(null);
    setScanResult(null);

    Alert.alert('Meal Saved to Cloud! ☁️', `${scanResult.food_name} (${scanResult.calories} kcal) saved to your Supabase account.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Top Header Bar */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.userProfileGroup} onPress={() => setShowProfileModal(true)}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImg}
            />
            <View>
              <Text style={styles.greetingText}>{user ? 'Good morning!' : 'Welcome'}</Text>
              <Text style={styles.userNameText}>{userName}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            {!user ? (
              <TouchableOpacity
                style={styles.guestLoginPill}
                onPress={() => router.push('/auth' as any)}
              >
                <Ionicons name="log-in-outline" size={14} color="#0F172A" />
                <Text style={styles.guestLoginPillText}>Sign In</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.circleIconBtn} onPress={() => setShowApiKeyModal(true)}>
                <Ionicons name="key-outline" size={20} color="#1E293B" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.circleIconBtn} onPress={() => setShowNotifModal(true)}>
              <Ionicons name="notifications-outline" size={20} color="#1E293B" />
              <View style={styles.redBadge} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Guest Mode Banner if not logged in */}
        {!user && (
          <TouchableOpacity
            style={styles.guestBannerCard}
            onPress={() => router.push('/auth' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.guestBannerIcon}>
              <Ionicons name="cloud-upload-outline" size={20} color="#84CC16" />
            </View>
            <View style={styles.guestBannerTextCol}>
              <Text style={styles.guestBannerTitle}>Guest Mode Active</Text>
              <Text style={styles.guestBannerSub}>Sign in to save your AI photo meal scans to cloud DB.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#0F172A" />
          </TouchableOpacity>
        )}

        {/* Hero Weekly Progress Card */}
        <View style={styles.weeklyProgressHeroCard}>
          <View style={styles.heroLeftCol}>
            <View style={styles.dailyIntakePill}>
              <Ionicons name="flash" size={12} color="#0F172A" />
              <Text style={styles.dailyIntakePillText}>Daily intake</Text>
            </View>
            <Text style={styles.heroWeeklyTitle}>Your Weekly{'\n'}Progress</Text>
            <Text style={styles.heroSubText}>
              {totalCalories} / {targetCalories} kcal logged today
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

        {/* 2-Grid Stats Widgets */}
        <View style={styles.statsGridRow}>
          <View style={styles.statWidgetCard}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconBox, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="footsteps" size={16} color="#F97316" />
              </View>
              <Text style={styles.statWidgetTitle}>Step to walk</Text>
            </View>
            <Text style={styles.statWidgetBigNum}>5,500 <Text style={styles.statWidgetUnit}>steps</Text></Text>
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

        {/* Real AI Scanner Action Buttons Card */}
        <View style={styles.aiActionCard}>
          <View style={styles.aiActionHeader}>
            <View style={styles.aiBadge}>
              <Ionicons name="camera" size={14} color="#84CC16" />
              <Text style={styles.aiBadgeText}>REAL AI VISION SCANNER</Text>
            </View>
            <TouchableOpacity onPress={() => setShowApiKeyModal(true)} style={styles.keyBtn}>
              <Ionicons name="key-outline" size={12} color="#84CC16" />
              <Text style={styles.keyBtnText}>{customApiKey ? 'Key Active' : 'Set Key'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.aiActionTitle}>Snap any Fruit or Meal Photo for Real AI Analysis</Text>

          <View style={styles.scanBtnRow}>
            <TouchableOpacity
              style={styles.cameraScanBtn}
              onPress={handleLaunchCamera}
              activeOpacity={0.85}
            >
              <Ionicons name="camera-outline" size={18} color="#0F172A" />
              <Text style={styles.cameraScanBtnText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.galleryScanBtn}
              onPress={handleLaunchGallery}
              activeOpacity={0.85}
            >
              <Ionicons name="images-outline" size={18} color="#0F172A" />
              <Text style={styles.galleryScanBtnText}>Choose Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* August 2025 Calendar Strip */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeaderRow}>
            <Text style={styles.monthTitleText}>August 2025</Text>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </View>

          <View style={styles.daysFlexRow}>
            {[
              { day: 'S', date: '07' },
              { day: 'M', date: '08' },
              { day: 'T', date: '09' },
              { day: 'W', date: '10', active: true },
              { day: 'T', date: '11' },
              { day: 'F', date: '12' },
              { day: 'S', date: '13' },
            ].map((item, index) => (
              <View
                key={index}
                style={[
                  styles.dayColumnCard,
                  item.active && styles.activeDayColumnCard,
                ]}
              >
                <Text style={[styles.dayLabelText, item.active && styles.activeDayText]}>
                  {item.day}
                </Text>
                <Text style={[styles.dateNumText, item.active && styles.activeDateNumText]}>
                  {item.date}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Today's Logged Meals */}
        <View style={styles.mealsSection}>
          <Text style={styles.mealsSectionTitle}>Today's Logged Meals</Text>

          {meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
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
            </View>
          ))}
        </View>
      </ScrollView>

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

      <ProfileModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <NotificationModal visible={showNotifModal} onClose={() => setShowNotifModal(false)} />
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
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#BEF264',
    marginBottom: 20,
  },
  aiActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FEE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  aiBadgeText: {
    color: '#84CC16',
    fontSize: 10,
    fontWeight: '800',
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
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  scanBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cameraScanBtn: {
    flex: 1,
    backgroundColor: '#BEF264',
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cameraScanBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  galleryScanBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  galleryScanBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
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
});
