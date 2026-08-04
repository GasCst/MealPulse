import React, { createContext, useContext, useState, useEffect } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MonetizationPlans } from '@/constants/theme';
import { RevenueCatService } from '@/services/revenueCatService';
import { supabase, SupabaseService, ExpoGoSafeAsyncStorage } from '@/services/supabaseService';
import { PurchaseService } from '@/services/purchaseService';

export type PlanType = 'weekly' | 'monthly' | 'yearly' | 'jackpot';
export type AppMode = 'end_user' | 'creator_admin';

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
  appMode: AppMode;
  targetCalories: number;
  primaryGoal: string;
  
  // Actions
  openPaywall: (source?: string) => void;
  closePaywall: () => void;
  subscribe: (planKey: PlanType) => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
  recordUsage: () => boolean; // returns true if within limit, false if locked
  restorePurchases: () => Promise<boolean>;
  setCompletedOnboarding: (status: boolean) => Promise<void>;
  setAppMode: (mode: AppMode) => void;
  setTargetCalories: (kcal: number) => Promise<void>;
  setPrimaryGoal: (goal: string) => Promise<void>;
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
  const [targetCalories, setTargetCaloriesState] = useState<number>(1920);
  const [primaryGoal, setPrimaryGoalState] = useState<string>('Lose Weight');
  
  // Simulated MRR Engine metrics for demonstration & goal tracking
  const [simulatedSubscribers, setSimulatedSubscribers] = useState<number>(84);
  const maxFreeUsage = 3;

  useEffect(() => {
    loadSavedState();

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

    // 3. Listen to Supabase Auth state changes (Google OAuth, Email Login, Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        
        // Ensure user row exists in public.profiles table
        await SupabaseService.ensureUserProfile(session.user);

        // Fetch real cloud profile entitlement
        const profile = await SupabaseService.getUserProfile(session.user.id);
        if (profile) {
          setIsPro(profile.is_pro ?? false);
          setCurrentPlan(profile.current_plan ?? null);
        } else {
          // New user defaults to Free Tier
          setIsPro(false);
          setCurrentPlan(null);
        }
      } else {
        // Guest user mode ALWAYS defaults to isPro: false (Free Tier)
        setUser(null);
        setIsPro(false);
        setCurrentPlan(null);
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
      authListener.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const loadSavedState = async () => {
    try {
      const saved = await ExpoGoSafeAsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setHasCompletedOnboardingState(data.hasCompletedOnboarding ?? false);
      }
    } catch (e) {
      console.warn('Failed to load subscription state:', e);
    }
  };

  const saveState = async (updates: Partial<{
    isPro: boolean;
    currentPlan: PlanType | null;
    isTrialActive: boolean;
    freeUsageCount: number;
    hasCompletedOnboarding: boolean;
  }>) => {
    try {
      const currentState = {
        isPro,
        currentPlan,
        isTrialActive,
        freeUsageCount,
        hasCompletedOnboarding,
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
    saveState({ freeUsageCount: nextCount });
    return true;
  };

  const restorePurchases = async (): Promise<boolean> => {
    const restored = await RevenueCatService.restorePurchases();
    if (restored) {
      setIsPro(true);
      await saveState({ isPro: true });
      return true;
    }
    await subscribe('monthly');
    return true;
  };

  const setCompletedOnboarding = async (status: boolean) => {
    setHasCompletedOnboardingState(status);
    await saveState({ hasCompletedOnboarding: status });
  };

  const setTargetCalories = async (kcal: number) => {
    setTargetCaloriesState(kcal);
  };

  const setPrimaryGoal = async (goal: string) => {
    setPrimaryGoalState(goal);
  };

  // Calculate MRR based on active subscribers
  const mrrPerSub = currentPlan ? MonetizationPlans[currentPlan].mrrEquivalent : 14.99;
  const totalSubscribers = simulatedSubscribers + (isPro ? 1 : 0);
  const calculatedMrr = Math.round(totalSubscribers * mrrPerSub);

  const [appMode, setAppMode] = useState<AppMode>('end_user');

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
        appMode,
        targetCalories,
        primaryGoal,
        openPaywall,
        closePaywall,
        subscribe,
        cancelSubscription,
        recordUsage,
        restorePurchases,
        setCompletedOnboarding,
        setAppMode,
        setTargetCalories,
        setPrimaryGoal,
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
