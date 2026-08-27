import React, { createContext, useContext, useState, useEffect } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MonetizationPlans } from '@/constants/theme';
import { RevenueCatService } from '@/services/revenueCatService';
import { supabase, SupabaseService, ExpoGoSafeAsyncStorage } from '@/services/supabaseService';
import { PurchaseService } from '@/services/purchaseService';
import { AuthService } from '@/services/authService';
import { HealthSyncService, DailyHealthActivity, HealthSyncStatus } from '@/services/healthSyncService';
import { UnitSystem } from '@/services/unitService';

export type PlanType = 'weekly' | 'monthly' | 'yearly' | 'jackpot';
export type AppMode = 'end_user' | 'creator_admin';

export interface UserBiometrics {
  gender: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'intense';
  primaryGoal: string;
  allergies: string[];
  dietPreference: string;
  bmr: number;
  tdee: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  unitSystem?: UnitSystem;
}

interface SubscriptionContextType {
  user: any | null;
  isPro: boolean;
  currentPlan: PlanType | null;
  isTrialActive: boolean;
  trialDaysLeft: number;
  freeUsageCount: number;
  maxFreeUsage: number;
  showPaywall: boolean;
  paywallSource: string;
  simulatedSubscribers: number;
  calculatedMrr: number;
  hasCompletedOnboarding: boolean;
  hasSeenSpinWheel: boolean;
  isLoaded: boolean;
  appMode: AppMode;
  targetCalories: number;
  waterTarget: number;
  primaryGoal: string;
  biometrics: UserBiometrics | null;
  unitSystem: UnitSystem;
  scanAccuracy: 'Fast' | 'Balanced' | 'Precise';
  autoPortionEstimation: boolean;
  multiItemDetection: boolean;
  saveScansToCloud: boolean;
  isWriting: boolean;
  
  // Health & Wearables State
  isHealthSyncEnabled: boolean;
  includeBurnedInBudget: boolean;
  burnedCaloriesToday: number;
  stepsToday: number;
  exerciseMinutesToday: number;
  lastHealthSyncTime: string | null;
  healthSyncStatus: HealthSyncStatus;
  dailyActivitiesByDate: Record<string, DailyHealthActivity>;
  getActivityForDate: (dateStr: string) => Promise<DailyHealthActivity>;
  getActivityForDateSync: (dateStr: string) => { activeCalories: number; steps: number; exerciseMinutes: number };

  // Hydration / Water State
  waterIntakeToday: number;
  waterIntakeByDate: Record<string, number>;
  getWaterIntakeForDateSync: (dateStr: string) => number;
  loadWaterIntakeForDate: (dateStr: string) => Promise<number>;
  updateWaterIntake: (delta: number, targetDateStr?: string) => Promise<void>;
  loadWaterIntake: () => Promise<void>;

  // Actions
  beginWrite: () => void;
  endWrite: () => void;
  signOutSafe: () => Promise<boolean>;
  openPaywall: (source?: string) => void;
  closePaywall: () => void;
  subscribe: (planKey: PlanType) => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
  recordUsage: () => boolean; // returns true if within limit, false if locked
  restorePurchases: () => Promise<boolean>;
  setCompletedOnboarding: (status: boolean) => Promise<void>;
  setHasSeenSpinWheel: (status: boolean) => Promise<void>;
  setAppMode: (mode: AppMode) => void;
  setTargetCalories: (kcal: number) => Promise<void>;
  setWaterTarget: (ml: number) => Promise<void>;
  setPrimaryGoal: (goal: string) => Promise<void>;
  setUnitSystem: (system: UnitSystem) => Promise<void>;
  saveBiometrics: (bio: UserBiometrics) => Promise<void>;
  updateBiometrics: (bio: Partial<UserBiometrics>) => Promise<void>;
  setScanAccuracy: (accuracy: 'Fast' | 'Balanced' | 'Precise') => Promise<void>;
  setAutoPortionEstimation: (enabled: boolean) => Promise<void>;
  setMultiItemDetection: (enabled: boolean) => Promise<void>;
  setSaveScansToCloud: (enabled: boolean) => Promise<void>;
  setHealthSyncEnabled: (enabled: boolean) => Promise<boolean>;
  setIncludeBurnedInBudget: (enabled: boolean) => Promise<void>;
  triggerHealthSync: (dateInput?: string) => Promise<DailyHealthActivity>;
  addManualBurnedCalories: (
    typeOrKcal: string | number,
    kcalOrSteps?: number,
    stepsOrMinutes?: number,
    minutes?: number,
    dateStr?: string
  ) => Promise<void>;
  presentRevenueCatPaywall: () => Promise<boolean>;
  presentCustomerCenter: () => Promise<void>;
}

const STORAGE_KEY = '@focus_pulse_subscription_v1';

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<PlanType | null>(null);
  const [isTrialActive, setIsTrialActive] = useState<boolean>(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(3);
  const [freeUsageCount, setFreeUsageCount] = useState<number>(0);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [paywallSource, setPaywallSource] = useState<string>('manual');
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState<boolean>(false);
  const [hasSeenSpinWheel, setHasSeenSpinWheelState] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [targetCalories, setTargetCaloriesState] = useState<number>(1920);
  const [waterTarget, setWaterTargetState] = useState<number>(2500);
  const [primaryGoal, setPrimaryGoalState] = useState<string>('Lose Weight');
  const [biometrics, setBiometricsState] = useState<UserBiometrics | null>(null);
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('metric');
  
  const [scanAccuracy, setScanAccuracyState] = useState<'Fast' | 'Balanced' | 'Precise'>('Balanced');
  const [autoPortionEstimation, setAutoPortionEstimationState] = useState<boolean>(true);
  const [multiItemDetection, setMultiItemDetectionState] = useState<boolean>(true);
  const [saveScansToCloud, setSaveScansToCloudState] = useState<boolean>(false);
  
  // Health & Wearables State
  const [isHealthSyncEnabled, setIsHealthSyncEnabledState] = useState<boolean>(false);
  const [includeBurnedInBudget, setIncludeBurnedInBudgetState] = useState<boolean>(true);
  const [burnedCaloriesToday, setBurnedCaloriesToday] = useState<number>(0);
  const [stepsToday, setStepsToday] = useState<number>(0);
  const [exerciseMinutesToday, setExerciseMinutesToday] = useState<number>(0);
  const [lastHealthSyncTime, setLastHealthSyncTime] = useState<string | null>(null);
  const [healthSyncStatus, setHealthSyncStatus] = useState<HealthSyncStatus>('idle');
  const [dailyActivitiesByDate, setDailyActivitiesByDate] = useState<Record<string, DailyHealthActivity>>({});

  // Simulated MRR Engine metrics for demonstration & goal tracking
  const [simulatedSubscribers, setSimulatedSubscribers] = useState<number>(84);
  const maxFreeUsage = 3;

  useEffect(() => {
    loadSavedState();

    // 0. Ensure user has a valid Supabase session (either existing or Anonymous Guest)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        console.log('[Supabase Auth] No active session found, signing in anonymously for Guest user...');
        await AuthService.signInAnonymously();
      }
    });

    // 1. Initialize RevenueCat SDK
    PurchaseService.init().then((info) => {
      if (info) {
        const isEntitled = PurchaseService.isEntitledToPro(info);
        if (isEntitled) {
          setIsPro(true);
        }
      }
    });

    // 2. Realtime listener for RevenueCat Customer Info (renewals/cancellations)
    const listener = PurchaseService.addCustomerInfoUpdateListener((info) => {
      const isEntitled = PurchaseService.isEntitledToPro(info);
      setIsPro(isEntitled);
    });

    // 3. Listen to Supabase Auth state changes (Google OAuth, Email Login, Anonymous, Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        
        // Ensure user row exists in public.profiles table
        await SupabaseService.ensureUserProfile(session.user);

        // Run one-time background sync from local AsyncStorage cache to cloud
        await SupabaseService.syncLocalCacheToCloud(session.user);

        // Fetch real cloud profile
        const profile = await SupabaseService.getUserProfile(session.user.id);
        
        // Check RevenueCat SDK for active purchase entitlement
        let rcIsPro = false;
        try {
          const info = await PurchaseService.init(session.user.id);
          if (info) {
            rcIsPro = PurchaseService.isEntitledToPro(info);
          }
        } catch (e) {
          console.warn('[AuthSync] RevenueCat check notice:', e);
        }

        // PRESERVE PRO STATUS: Cloud profile OR RevenueCat OR current local state
        const finalIsPro = rcIsPro || (profile?.is_pro ?? false) || isPro;
        setIsPro(finalIsPro);
        if (profile?.current_plan) setCurrentPlan(profile.current_plan);

        if (finalIsPro) {
          await SupabaseService.updateUserProfile(session.user.id, { is_pro: true });
        }

        // PRESERVE ONBOARDING: Local explicit flag OR Cloud profile (fresh installs always start false)
        const localOnboarding = await ExpoGoSafeAsyncStorage.getItem('@mealpulse_onboarding_completed_v2');
        const finalOnboarding = (localOnboarding === 'true') || (profile?.has_completed_onboarding === true);
        setHasCompletedOnboardingState(finalOnboarding);
        if (finalOnboarding) {
          await SupabaseService.updateUserProfile(session.user.id, { has_completed_onboarding: true });
        }

        if (profile) {
          if (profile.scan_accuracy) setScanAccuracyState(profile.scan_accuracy);
          if (profile.auto_portion_estimation !== undefined) setAutoPortionEstimationState(profile.auto_portion_estimation);
          if (profile.multi_item_detection !== undefined) setMultiItemDetectionState(profile.multi_item_detection);
          if (profile.save_scans_to_cloud !== undefined) setSaveScansToCloudState(profile.save_scans_to_cloud);
        }

        const cloudBio = await SupabaseService.getUserBiometrics(session.user.id);
        if (cloudBio) {
          const mappedBio: UserBiometrics = {
            gender: cloudBio.gender,
            age: cloudBio.age,
            heightCm: Number(cloudBio.height_cm),
            weightKg: Number(cloudBio.weight_kg),
            goalWeightKg: Number(cloudBio.goal_weight_kg),
            activityLevel: cloudBio.activity_level,
            primaryGoal: cloudBio.primary_goal,
            allergies: cloudBio.allergies || [],
            dietPreference: cloudBio.diet_preference,
            bmr: Number(cloudBio.bmr),
            tdee: Number(cloudBio.tdee),
            targetProtein: Number(cloudBio.target_protein),
            targetCarbs: Number(cloudBio.target_carbs),
            targetFat: Number(cloudBio.target_fat),
          };
          setBiometricsState(mappedBio);
          if (cloudBio.target_calories) setTargetCaloriesState(Number(cloudBio.target_calories));
          if (cloudBio.water_target) setWaterTargetState(Number(cloudBio.water_target));
          if (cloudBio.primary_goal) setPrimaryGoalState(cloudBio.primary_goal);
        }

        // Fetch today's health/wearable activity from Supabase Cloud
        try {
          const todayStr = HealthSyncService.getTodayDateString();
          const cloudActivity = await SupabaseService.getDailyActivity(session.user.id, todayStr);
          if (cloudActivity) {
            setBurnedCaloriesToday(Number(cloudActivity.active_calories || 0));
            setStepsToday(Number(cloudActivity.steps || 0));
            setExerciseMinutesToday(Number(cloudActivity.exercise_minutes || 0));
            if (cloudActivity.synced_at) setLastHealthSyncTime(cloudActivity.synced_at);
          }
        } catch (e) {
          console.warn('[AuthSync] getDailyActivity notice:', e);
        }
      } else {
        // Sign Out / Guest user mode: Reset all memory & account states to Guest defaults!
        setUser(null);
        setIsPro(false);
        setCurrentPlan(null);
        setBiometricsState(null);
        setTargetCaloriesState(1920);
        setWaterTargetState(2500);
        setPrimaryGoalState('Lose Weight');
      }
    });

    // Listen to Deep Link URL events for Google OAuth callback in Expo Go
    const handleDeepLink = async (event: { url: string }) => {
      if (!event.url) return;
      console.log(`[DeepLink Handler] Received URL: ${event.url}`);

      if (event.url.includes('access_token') || event.url.includes('refresh_token')) {
        try {
          const extractToken = (url: string, param: string) => {
            const match = url.match(new RegExp(`[?&#]${param}=([^&]+)`));
            return match ? decodeURIComponent(match[1]) : null;
          };

          const accessToken = extractToken(event.url, 'access_token');
          const refreshToken = extractToken(event.url, 'refresh_token');

          if (accessToken && refreshToken) {
            console.log('[DeepLink Handler] Exchanging OAuth tokens with Supabase...');
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            console.log('[DeepLink Handler] Supabase Session established via DeepLink!');
          }
        } catch (e: any) {
          console.warn('[DeepLink Handler Error]', e.message);
        }
      }
    };

    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      try {
        authListener?.subscription?.unsubscribe?.();
      } catch {}
      try {
        linkSubscription?.remove?.();
      } catch {}
      try {
        listener?.remove?.();
      } catch {}
    };
  }, []);

  const loadSavedState = async () => {
    try {
      const saved = await ExpoGoSafeAsyncStorage.getItem(STORAGE_KEY);
      const onboardingFlag = await ExpoGoSafeAsyncStorage.getItem('@mealpulse_onboarding_completed_v2');
      
      // Explicitly check onboarding status (fresh installs will be null/false)
      setHasCompletedOnboardingState(onboardingFlag === 'true');

      if (saved) {
        const data = JSON.parse(saved);
        if (data.hasSeenSpinWheel !== undefined) setHasSeenSpinWheelState(data.hasSeenSpinWheel);
        if (data.biometrics) setBiometricsState(data.biometrics);
        if (data.targetCalories) setTargetCaloriesState(data.targetCalories);
        if (data.waterTarget) setWaterTargetState(data.waterTarget);
        if (data.primaryGoal) setPrimaryGoalState(data.primaryGoal);
        if (data.unitSystem === 'imperial' || data.unitSystem === 'metric') setUnitSystemState(data.unitSystem);
        if (data.scanAccuracy) setScanAccuracyState(data.scanAccuracy);
        if (data.autoPortionEstimation !== undefined) setAutoPortionEstimationState(data.autoPortionEstimation);
        if (data.multiItemDetection !== undefined) setMultiItemDetectionState(data.multiItemDetection);
        if (data.saveScansToCloud !== undefined) setSaveScansToCloudState(data.saveScansToCloud);
      }

      // Check explicit unit system key
      const explicitUnit = await ExpoGoSafeAsyncStorage.getItem('@mealpulse_unit_system_v1');
      if (explicitUnit === 'imperial' || explicitUnit === 'metric') {
        setUnitSystemState(explicitUnit);
      }

      // Load HealthKit & Health Connect preferences & cached activities for recent days
      const healthSettings = await HealthSyncService.getSettings();
      setIsHealthSyncEnabledState(healthSettings.isEnabled);
      setIncludeBurnedInBudgetState(healthSettings.includeInBudget);

      const todayStr = HealthSyncService.getTodayDateString();
      const cachedToday = await HealthSyncService.getCachedActivity(todayStr);
      if (cachedToday) {
        setBurnedCaloriesToday(cachedToday.activeCalories);
        setStepsToday(cachedToday.steps);
        setExerciseMinutesToday(cachedToday.exerciseMinutes);
        setLastHealthSyncTime(cachedToday.lastSyncedAt);
        setDailyActivitiesByDate((prev) => ({ ...prev, [todayStr]: cachedToday }));
      }

      // Sync recent 7 days in background so yesterday and past days are immediately populated
      HealthSyncService.syncRecentDaysActivity(user?.id, 7).then((recentMap) => {
        setDailyActivitiesByDate((prev) => ({ ...prev, ...recentMap }));
        if (recentMap[todayStr]) {
          const act = recentMap[todayStr];
          setBurnedCaloriesToday(act.activeCalories);
          setStepsToday(act.steps);
          setExerciseMinutesToday(act.exerciseMinutes);
          setLastHealthSyncTime(act.lastSyncedAt);
        }
      }).catch(() => {});
      // Load Water Intake for today
      await loadWaterIntake();
    } catch (e) {
      console.warn('Failed to load subscription state:', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const [waterIntakeByDate, setWaterIntakeByDate] = useState<Record<string, number>>({});
  const todayDateStr = new Date().toISOString().split('T')[0];
  const waterIntakeToday = waterIntakeByDate[todayDateStr] ?? 0;

  const getWaterIntakeForDateSync = (dateStr: string): number => {
    return waterIntakeByDate[dateStr] ?? 0;
  };

  const loadWaterIntakeForDate = async (dateStr: string): Promise<number> => {
    try {
      if (user?.id) {
        const cloudLog = await SupabaseService.getWaterLog(user.id, dateStr);
        if (cloudLog && cloudLog.amount_ml !== undefined) {
          const val = Number(cloudLog.amount_ml);
          setWaterIntakeByDate((prev) => ({ ...prev, [dateStr]: val }));
          return val;
        }
      }
      const storageKey = user?.id
        ? `@mealpulse_water_intake_v1_${user.id}_${dateStr}`
        : `@mealpulse_water_intake_v1_guest_${dateStr}`;
      const saved = await ExpoGoSafeAsyncStorage.getItem(storageKey);
      const val = saved ? parseInt(saved, 10) || 0 : 0;
      setWaterIntakeByDate((prev) => ({ ...prev, [dateStr]: val }));
      return val;
    } catch (e) {
      console.warn(`Error loading water intake for date ${dateStr}:`, e);
      return 0;
    }
  };

  const loadWaterIntake = async () => {
    try {
      const today = new Date();
      const datesToLoad: string[] = [];
      for (let i = -7; i <= 3; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        datesToLoad.push(`${year}-${month}-${day}`);
      }
      await Promise.all(datesToLoad.map((dStr) => loadWaterIntakeForDate(dStr)));
    } catch (e) {
      console.warn('Error batch loading water intake:', e);
    }
  };

  const updateWaterIntake = async (delta: number, targetDateStr?: string) => {
    beginWrite();
    try {
      const dateStr = targetDateStr || new Date().toISOString().split('T')[0];
      const currentVal = waterIntakeByDate[dateStr] ?? 0;
      const nextVal = Math.max(0, Math.min(6000, currentVal + delta));

      setWaterIntakeByDate((prev) => ({
        ...prev,
        [dateStr]: nextVal,
      }));

      const storageKey = user?.id
        ? `@mealpulse_water_intake_v1_${user.id}_${dateStr}`
        : `@mealpulse_water_intake_v1_guest_${dateStr}`;
      await ExpoGoSafeAsyncStorage.setItem(storageKey, nextVal.toString());

      try {
        const datesKey = '@mealpulse_all_guest_water_dates_v1';
        const raw = await ExpoGoSafeAsyncStorage.getItem(datesKey);
        const dates: string[] = raw ? JSON.parse(raw) : [];
        if (!dates.includes(dateStr)) {
          dates.push(dateStr);
          await ExpoGoSafeAsyncStorage.setItem(datesKey, JSON.stringify(dates));
        }
      } catch {}

      if (user?.id) {
        await SupabaseService.saveWaterLog(user.id, dateStr, nextVal, waterTarget || 2500);
      }
    } catch (e) {
      console.warn('Error saving water intake:', e);
    } finally {
      endWrite();
    }
  };

  useEffect(() => {
    loadWaterIntake();
  }, [user]);

  const saveState = async (updates: Partial<{
    isPro: boolean;
    currentPlan: PlanType | null;
    isTrialActive: boolean;
    freeUsageCount: number;
    hasCompletedOnboarding: boolean;
    hasSeenSpinWheel: boolean;
    targetCalories: number;
    waterTarget: number;
    primaryGoal: string;
    biometrics: UserBiometrics | null;
    unitSystem: UnitSystem;
    scanAccuracy: 'Fast' | 'Balanced' | 'Precise';
    autoPortionEstimation: boolean;
    multiItemDetection: boolean;
    saveScansToCloud: boolean;
  }>) => {
    try {
      const currentState = {
        isPro,
        currentPlan,
        isTrialActive,
        freeUsageCount,
        hasCompletedOnboarding,
        hasSeenSpinWheel,
        targetCalories,
        waterTarget,
        primaryGoal,
        biometrics,
        unitSystem,
        scanAccuracy,
        autoPortionEstimation,
        multiItemDetection,
        saveScansToCloud,
        ...updates,
      };
      await ExpoGoSafeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch (e) {
      console.warn('Failed to save subscription state:', e);
    }
  };

  const openPaywall = (source: string = 'manual') => {
    setPaywallSource(source);
    setShowPaywall(true);
  };

  const closePaywall = () => {
    setShowPaywall(false);
  };

  const subscribe = async (planKey: PlanType): Promise<boolean> => {
    try {
      // 1. Fetch available RevenueCat Offerings
      const { packages } = await PurchaseService.getOfferings();
      
      const targetPackage = packages.find((p) => {
        const id = p.product.identifier.toLowerCase();
        const pkgId = p.identifier.toLowerCase();
        if (planKey === 'jackpot') {
          return id.includes('jackpot') || id.includes('299') || id.includes('80') || pkgId.includes('jackpot');
        }
        if (planKey === 'weekly') {
          return id.includes('weekly') || pkgId.includes('weekly') || p.packageType === 'WEEKLY';
        }
        if (planKey === 'monthly') {
          return id.includes('monthly') || pkgId.includes('monthly') || p.packageType === 'MONTHLY';
        }
        if (planKey === 'yearly') {
          return id.includes('annual') || id.includes('yearly') || pkgId.includes('annual') || p.packageType === 'ANNUAL';
        }
        return false;
      }) || packages.find((p) => p.product.identifier.includes('weekly')) || packages[0];

      if (!targetPackage) {
        console.warn(`[SubscriptionContext] Target RevenueCat package not found for ${planKey}`);
        return false;
      }

      console.log(`[SubscriptionContext] Purchasing package: ${targetPackage.product.identifier} (${targetPackage.product.priceString})`);

      // 2. Execute Purchase with RevenueCat SDK
      const purchaseResult = await PurchaseService.purchasePackage(targetPackage);

      // 3. IF USER CANCELLED OR PAYMENT FAILED -> DO NOT GRANT PRO!
      if (purchaseResult.userCancelled || !purchaseResult.success) {
        console.log('[SubscriptionContext] Purchase was cancelled or unverified. Pro access not granted.');
        return false;
      }

      // 4. VERIFIED PAYMENT -> Grant Pro Access
      const isTrial = planKey === 'weekly';
      setIsPro(true);
      setCurrentPlan(planKey);
      setIsTrialActive(isTrial);
      setTrialDaysLeft(3);
      setShowPaywall(false);

      // 5. Persist real transaction to Supabase Cloud DB
      if (user?.id) {
        const planPrices: Record<PlanType, number> = { weekly: 4.99, monthly: 17.99, yearly: 74.99, jackpot: 2.99 };
        await SupabaseService.saveUserSubscription(user.id, planKey, planPrices[planKey]);
        await SupabaseService.updateUserProfile(user.id, { is_pro: true, current_plan: planKey });
      }

      await saveState({
        isPro: true,
        currentPlan: planKey,
        isTrialActive: isTrial,
      });

      return true;
    } catch (e: any) {
      console.warn('[SubscriptionContext] Subscribe Exception:', e.message || e);
      return false;
    }
  };

  const cancelSubscription = async () => {
    setIsPro(false);
    setCurrentPlan(null);
    setIsTrialActive(false);
    await saveState({
      isPro: false,
      currentPlan: null,
      isTrialActive: false,
    });
  };

  const recordUsage = (): boolean => {
    // Free users have unlimited photo picking capability, but MUST watch a sponsor ad per scan!
    const nextCount = freeUsageCount + 1;
    setFreeUsageCount(nextCount);
    saveState({ freeUsageCount: nextCount }).catch((e) =>
      console.warn('Failed to persist usage count:', e)
    );
    return true;
  };

  const restorePurchases = async (): Promise<boolean> => {
    const restored = await RevenueCatService.restorePurchases();
    if (restored) {
      setIsPro(true);
      await saveState({ isPro: true });
      return true;
    }
    return false;
  };

  const setCompletedOnboarding = async (status: boolean) => {
    setHasCompletedOnboardingState(status);
    await ExpoGoSafeAsyncStorage.setItem('@mealpulse_onboarding_completed_v2', status ? 'true' : 'false');
    if (user?.id) {
      await SupabaseService.updateUserProfile(user.id, { has_completed_onboarding: status });
    }
    await saveState({ hasCompletedOnboarding: status });
  };

  const setHasSeenSpinWheel = async (status: boolean) => {
    setHasSeenSpinWheelState(status);
    await saveState({ hasSeenSpinWheel: status });
  };

  const setTargetCalories = async (kcal: number) => {
    setTargetCaloriesState(kcal);
    if (user?.id) {
      await SupabaseService.updateUserProfile(user.id, { target_calories: kcal });
      if (biometrics) {
        await SupabaseService.saveUserBiometrics(user.id, { ...biometrics, tdee: kcal });
      }
    }
    await saveState({ targetCalories: kcal });
  };

  const setWaterTarget = async (ml: number) => {
    setWaterTargetState(ml);
    if (user?.id) {
      await SupabaseService.updateUserProfile(user.id, { water_target: ml });
      if (biometrics) {
        await SupabaseService.saveUserBiometrics(user.id, { ...biometrics, waterTarget: ml });
      }
    }
    await saveState({ waterTarget: ml });
  };

  const setPrimaryGoal = async (goal: string) => {
    setPrimaryGoalState(goal);
    if (user?.id && biometrics) {
      await SupabaseService.saveUserBiometrics(user.id, { ...biometrics, primaryGoal: goal });
    }
    await saveState({ primaryGoal: goal });
  };

  const setUnitSystem = async (system: UnitSystem) => {
    setUnitSystemState(system);
    await ExpoGoSafeAsyncStorage.setItem('@mealpulse_unit_system_v1', system);
    if (user?.id) {
      await SupabaseService.updateUserProfile(user.id, { unit_system: system } as any);
      if (biometrics) {
        await SupabaseService.saveUserBiometrics(user.id, { ...biometrics, unitSystem: system });
      }
    }
    await saveState({ unitSystem: system });
  };

  const saveBiometrics = async (bio: UserBiometrics) => {
    setBiometricsState(bio);
    setTargetCaloriesState(bio.tdee);
    setPrimaryGoalState(bio.primaryGoal);
    if (user?.id) {
      await SupabaseService.saveUserBiometrics(user.id, bio);
      await SupabaseService.updateUserProfile(user.id, { target_calories: bio.tdee });
    }
    await saveState({
      biometrics: bio,
      targetCalories: bio.tdee,
      primaryGoal: bio.primaryGoal,
    });
  };

  const updateBiometrics = async (partialBio: Partial<UserBiometrics>) => {
    if (!biometrics) return;
    const updatedBio: UserBiometrics = {
      ...biometrics,
      ...partialBio,
    };
    await saveBiometrics(updatedBio);
  };

  const setScanAccuracy = async (accuracy: 'Fast' | 'Balanced' | 'Precise') => {
    setScanAccuracyState(accuracy);
    if (user?.id) {
      await SupabaseService.updateUserProfile(user.id, { scan_accuracy: accuracy });
    }
    await saveState({ scanAccuracy: accuracy });
  };

  const setAutoPortionEstimation = async (enabled: boolean) => {
    setAutoPortionEstimationState(enabled);
    if (user?.id) {
      await SupabaseService.updateUserProfile(user.id, { auto_portion_estimation: enabled });
    }
    await saveState({ autoPortionEstimation: enabled });
  };

  const setMultiItemDetection = async (enabled: boolean) => {
    setMultiItemDetectionState(enabled);
    if (user?.id) {
      await SupabaseService.updateUserProfile(user.id, { multi_item_detection: enabled });
    }
    await saveState({ multiItemDetection: enabled });
  };

  const setSaveScansToCloud = async (enabled: boolean) => {
    setSaveScansToCloudState(enabled);
    if (user?.id) {
      await SupabaseService.updateUserProfile(user.id, { save_scans_to_cloud: enabled });
    }
    await saveState({ saveScansToCloud: enabled });
  };

  const getActivityForDate = async (dateStr: string): Promise<DailyHealthActivity> => {
    if (dailyActivitiesByDate[dateStr]) {
      return dailyActivitiesByDate[dateStr];
    }
    const act = await HealthSyncService.fetchActivityForDate(dateStr, user?.id);
    setDailyActivitiesByDate((prev) => ({ ...prev, [dateStr]: act }));
    return act;
  };

  const getActivityForDateSync = (dateStr: string) => {
    if (dailyActivitiesByDate[dateStr]) {
      return {
        activeCalories: dailyActivitiesByDate[dateStr].activeCalories,
        steps: dailyActivitiesByDate[dateStr].steps,
        exerciseMinutes: dailyActivitiesByDate[dateStr].exerciseMinutes,
      };
    }
    const todayStr = HealthSyncService.getTodayDateString();
    if (dateStr === todayStr) {
      return {
        activeCalories: burnedCaloriesToday,
        steps: stepsToday,
        exerciseMinutes: exerciseMinutesToday,
      };
    }
    return { activeCalories: 0, steps: 0, exerciseMinutes: 0 };
  };

  const triggerHealthSync = async (dateInput?: string): Promise<DailyHealthActivity> => {
    setHealthSyncStatus('syncing');
    const targetDateStr = dateInput || HealthSyncService.getTodayDateString();
    const isTargetToday = targetDateStr === HealthSyncService.getTodayDateString();

    try {
      // 1. Sync requested date
      const activity = await HealthSyncService.syncDailyActivity(user?.id, targetDateStr);
      setDailyActivitiesByDate((prev) => ({ ...prev, [targetDateStr]: activity }));

      if (isTargetToday) {
        setBurnedCaloriesToday(activity.activeCalories);
        setStepsToday(activity.steps);
        setExerciseMinutesToday(activity.exerciseMinutes);
        setLastHealthSyncTime(activity.lastSyncedAt);
      }

      // 2. Also background sync recent 7 days to Supabase and cache
      HealthSyncService.syncRecentDaysActivity(user?.id, 7).then((recentMap) => {
        setDailyActivitiesByDate((prev) => ({ ...prev, ...recentMap }));
      }).catch(() => {});

      setHealthSyncStatus('synced');
      return activity;
    } catch (e) {
      console.warn('[SubscriptionContext] triggerHealthSync error:', e);
      setHealthSyncStatus('error');
      const fallback = (await HealthSyncService.getCachedActivity(targetDateStr)) || {
        activeCalories: 0,
        steps: 0,
        exerciseMinutes: 0,
        lastSyncedAt: new Date().toISOString(),
        source: 'manual' as const,
      };
      return fallback;
    }
  };

  const setHealthSyncEnabled = async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      const granted = await HealthSyncService.requestPermissions();
      if (!granted) {
        setHealthSyncStatus('unauthorized');
        return false;
      }
    }
    setIsHealthSyncEnabledState(enabled);
    await HealthSyncService.saveSettings(enabled, includeBurnedInBudget);
    if (enabled) {
      await triggerHealthSync();
    }
    return true;
  };

  const setIncludeBurnedInBudget = async (enabled: boolean): Promise<void> => {
    setIncludeBurnedInBudgetState(enabled);
    await HealthSyncService.saveSettings(isHealthSyncEnabled, enabled);
  };

  const addManualBurnedCalories = async (
    typeOrKcal: string | number,
    kcalOrSteps?: number,
    stepsOrMinutes?: number,
    minutes?: number,
    dateStr?: string
  ): Promise<void> => {
    let workoutType = 'Workout';
    let cal = 0;
    let stp = 0;
    let min = 0;

    if (typeof typeOrKcal === 'string') {
      workoutType = typeOrKcal;
      cal = kcalOrSteps || 0;
      stp = stepsOrMinutes || 0;
      min = minutes || 0;
    } else {
      cal = typeOrKcal || 0;
      stp = kcalOrSteps || 0;
      min = stepsOrMinutes || 0;
    }

    const targetDate = dateStr || HealthSyncService.getTodayDateString();
    const updated = await HealthSyncService.addManualActivity(workoutType, cal, stp, min, user?.id, targetDate);
    setDailyActivitiesByDate((prev) => ({ ...prev, [targetDate]: updated }));

    if (targetDate === HealthSyncService.getTodayDateString()) {
      setBurnedCaloriesToday(updated.activeCalories);
      setStepsToday(updated.steps);
      setExerciseMinutesToday(updated.exerciseMinutes);
      setLastHealthSyncTime(updated.lastSyncedAt);
    }
  };

  // Calculate MRR based on active subscribers
  const mrrPerSub = currentPlan ? MonetizationPlans[currentPlan].mrrEquivalent : 14.99;
  const totalSubscribers = simulatedSubscribers + (isPro ? 1 : 0);
  const calculatedMrr = Math.round(totalSubscribers * mrrPerSub);

  const [appMode, setAppMode] = useState<AppMode>('end_user');

  const [isWriting, setIsWriting] = useState<boolean>(false);
  const activeWritesCount = React.useRef<number>(0);

  const beginWrite = React.useCallback(() => {
    activeWritesCount.current += 1;
    setIsWriting(true);
  }, []);

  const endWrite = React.useCallback(() => {
    activeWritesCount.current = Math.max(0, activeWritesCount.current - 1);
    if (activeWritesCount.current === 0) {
      setIsWriting(false);
    }
  }, []);

  const signOutSafe = async (): Promise<boolean> => {
    console.log('[Auth SafeSignOut] Checking active write operations before signing out...');
    let waitMs = 0;
    while (activeWritesCount.current > 0 && waitMs < 3000) {
      console.log(`[Auth SafeSignOut] Waiting for active write to finish (${activeWritesCount.current} active)...`);
      await new Promise((r) => setTimeout(r, 100));
      waitMs += 100;
    }
    const ok = await AuthService.signOut();
    return ok;
  };

  const presentRevenueCatPaywall = async () => {
    const purchased = await PurchaseService.presentPaywall();
    if (purchased) {
      setIsPro(true);
    }
    return purchased;
  };

  const presentCustomerCenter = async () => {
    await PurchaseService.presentCustomerCenter();
  };

  return (
    <SubscriptionContext.Provider
      value={{
        user,
        isPro,
        currentPlan,
        isTrialActive,
        trialDaysLeft,
        freeUsageCount,
        maxFreeUsage,
        showPaywall,
        paywallSource,
        simulatedSubscribers: totalSubscribers,
        calculatedMrr,
        hasCompletedOnboarding,
        hasSeenSpinWheel,
        isLoaded,
        appMode,
        targetCalories,
        waterTarget,
        waterIntakeToday,
        waterIntakeByDate,
        getWaterIntakeForDateSync,
        loadWaterIntakeForDate,
        updateWaterIntake,
        loadWaterIntake,
        primaryGoal,
        biometrics,
        unitSystem,
        setUnitSystem,
        scanAccuracy,
        autoPortionEstimation,
        multiItemDetection,
        saveScansToCloud,
        isWriting,
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
        beginWrite,
        endWrite,
        signOutSafe,
        openPaywall,
        closePaywall,
        subscribe,
        cancelSubscription,
        recordUsage,
        restorePurchases,
        setCompletedOnboarding,
        setHasSeenSpinWheel,
        setAppMode,
        setTargetCalories,
        setWaterTarget,
        setPrimaryGoal,
        saveBiometrics,
        updateBiometrics,
        setScanAccuracy,
        setAutoPortionEstimation,
        setMultiItemDetection,
        setSaveScansToCloud,
        setHealthSyncEnabled,
        setIncludeBurnedInBudget,
        triggerHealthSync,
        addManualBurnedCalories,
        presentRevenueCatPaywall,
        presentCustomerCenter,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
