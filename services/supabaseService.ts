import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bjnqebnaboxufnxkngjb.supabase.co';

const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.warn('[SupabaseService] EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is missing.');
}

const memoryStorage = new Map<string, string>();

// Safe AsyncStorage adapter with memory storage fallback for Expo Go & SSR
export const ExpoGoSafeAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    try {
      const val = await AsyncStorage.getItem(key).catch(() => null);
      return val ?? memoryStorage.get(key) ?? null;
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();
    memoryStorage.set(key, value);
    try {
      await AsyncStorage.setItem(key, value).catch(() => {});
    } catch {
      // memory fallback active
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();
    memoryStorage.delete(key);
    try {
      await AsyncStorage.removeItem(key).catch(() => {});
    } catch {
      // memory fallback active
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoGoSafeAsyncStorage,
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface CloudMealLog {
  id: string;
  user_id: string;
  food_name: string;
  estimated_weight_g?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: string;
  logged_at: string;
  image_url?: string;
  logging_method?: 'ai_photo' | 'barcode' | 'manual';
  confidence_score?: number;
  item_count?: number;
  unit_weight_g?: number;
  health_score?: number;
  ai_insights?: string;
}

export interface UserBiometricsCloud {
  user_id: string;
  gender: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  goal_weight_kg: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'intense';
  primary_goal: string;
  allergies: string[];
  diet_preference: string;
  bmr: number;
  tdee: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  target_calories: number;
  water_target: number;
}

export class SupabaseService {
  /**
   * Syncs meal log to cloud database per user
   */
  static async saveMealLog(meal: Partial<CloudMealLog> & { user_id: string }): Promise<boolean> {
    if (!meal.user_id) return false;
    try {
      const logObj = {
        ...meal,
        logged_at: meal.logged_at || new Date().toISOString(),
      };
      const { error } = await supabase.from('meal_logs').upsert([logObj]);
      if (!error) return true;
      console.warn('Supabase saveMealLog notice:', error.message);
    } catch (e) {
      console.warn('Supabase offline mode, local sync active:', e);
    }
    return false;
  }

  /**
   * Updates an existing meal log record in Supabase Cloud DB
   */
  static async updateMealLog(id: string, updates: Partial<CloudMealLog>): Promise<boolean> {
    try {
      const { error } = await supabase.from('meal_logs').update(updates).eq('id', id);
      if (!error) return true;
      console.warn('Supabase updateMealLog notice:', error.message);
    } catch (e) {
      console.warn('Supabase update notice:', e);
    }
    return false;
  }

  /**
   * Deletes a meal log record from Supabase Cloud DB
   */
  static async deleteMealLog(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('meal_logs').delete().eq('id', id);
      if (!error) return true;
      console.warn('Supabase deleteMealLog notice:', error.message);
    } catch (e) {
      console.warn('Supabase delete notice:', e);
    }
    return false;
  }

  /**
   * Fetches user meal history for a specific date (YYYY-MM-DD)
   */
  static async fetchMealLogsByUserAndDate(userId?: string, targetDate?: string): Promise<CloudMealLog[]> {
    if (!userId) return [];
    try {
      let query = supabase.from('meal_logs').select('*').eq('user_id', userId);

      if (targetDate) {
        let year: number, month: number, day: number;

        if (typeof targetDate === 'string' && targetDate.includes('-')) {
          const parts = targetDate.split('T')[0].split('-');
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else {
          const d = new Date(targetDate);
          year = d.getFullYear();
          month = d.getMonth();
          day = d.getDate();
        }

        const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

        query = query.gte('logged_at', startOfDay.toISOString()).lte('logged_at', endOfDay.toISOString());
      }

      const { data, error } = await query.order('logged_at', { ascending: false });

      if (!error && data) {
        return data as CloudMealLog[];
      }
    } catch (e) {
      console.warn('Supabase fetch error:', e);
    }
    return [];
  }

  /**
   * Fetches all past historical meal logs for user
   */
  static async fetchMealLogsHistory(userId?: string): Promise<CloudMealLog[]> {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false });

      if (!error && data) {
        return data as CloudMealLog[];
      }
    } catch (e) {
      console.warn('Supabase history fetch error:', e);
    }
    return [];
  }

  /**
   * Fetches user profile entitlement from cloud DB
   */
  static async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Profile fetch notice:', e);
    }
    return null;
  }

  /**
   * Automatically creates or updates user row in public.profiles table upon login
   */
  static async ensureUserProfile(user: any) {
    if (!user?.id) return;
    try {
      const existing = await this.getUserProfile(user.id);
      const email = user.email;
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email?.split('@')[0] || 'Member User';

      const { error } = await supabase.from('profiles').upsert([
        {
          id: user.id,
          email: email,
          full_name: fullName,
          is_pro: existing?.is_pro ?? false,
          current_plan: existing?.current_plan ?? null,
          has_completed_onboarding: existing?.has_completed_onboarding ?? false,
          scan_accuracy: existing?.scan_accuracy ?? 'Balanced',
          auto_portion_estimation: existing?.auto_portion_estimation ?? true,
          multi_item_detection: existing?.multi_item_detection ?? true,
          save_scans_to_cloud: existing?.save_scans_to_cloud ?? true,
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.warn('Profile upsert notice:', error.message);
      }
    } catch (e) {
      console.warn('Ensure profile error:', e);
    }
  }

  /**
   * One-time background migration helper that uploads pre-existing local AsyncStorage data
   * (biometrics, water logs, onboarding settings) to Supabase Cloud DB for existing users.
   * Rules:
   * 1. Cloud Wins: If cloud data exists for a table/field, local data is discarded.
   * 2. Atomic Flag: Flag `@mealpulse_migrated_to_cloud_v1_${userId}` is set ONLY if all upserts succeed.
   * 3. Logging: Detailed console logs for start, success, partial failure/retry.
   */
  static async syncLocalCacheToCloud(user: any): Promise<boolean> {
    if (!user?.id) return false;
    const userId = user.id;
    const migrationFlagKey = `@mealpulse_migrated_to_cloud_v1_${userId}`;

    try {
      // Step 1: Check if user has already been migrated
      const alreadyMigrated = await ExpoGoSafeAsyncStorage.getItem(migrationFlagKey);
      if (alreadyMigrated === 'true') {
        console.log(`[CloudSync] User ${userId} already migrated. Skipping sync.`);
        return true;
      }

      console.log(`[CloudSync] STARTING one-time migration check for user ${userId}...`);

      let allUpsertsSucceeded = true;
      let syncAttemptedCount = 0;
      let syncSuccessCount = 0;
      const keysToRemoveOnAtomicSuccess: string[] = [];

      // Fetch cloud data
      const cloudProfile = await this.getUserProfile(userId);
      const cloudBio = await this.getUserBiometrics(userId);
      const todayStr = new Date().toISOString().split('T')[0];
      const cloudWater = await this.getWaterLog(userId, todayStr);

      // Read local storage
      const savedSubJson = await ExpoGoSafeAsyncStorage.getItem('@focus_pulse_subscription_v1');
      const localData = savedSubJson ? JSON.parse(savedSubJson) : null;

      // 1. Migrate Profiles / Settings if missing on cloud
      if (localData) {
        const profileUpdatesToApply: Record<string, any> = {};

        if ((cloudProfile?.has_completed_onboarding === null || cloudProfile?.has_completed_onboarding === undefined) && localData.hasCompletedOnboarding !== undefined) {
          profileUpdatesToApply.has_completed_onboarding = localData.hasCompletedOnboarding;
        }
        if (!cloudProfile?.scan_accuracy && localData.scanAccuracy) {
          profileUpdatesToApply.scan_accuracy = localData.scanAccuracy;
        }
        if ((cloudProfile?.auto_portion_estimation === null || cloudProfile?.auto_portion_estimation === undefined) && localData.autoPortionEstimation !== undefined) {
          profileUpdatesToApply.auto_portion_estimation = localData.autoPortionEstimation;
        }
        if ((cloudProfile?.multi_item_detection === null || cloudProfile?.multi_item_detection === undefined) && localData.multiItemDetection !== undefined) {
          profileUpdatesToApply.multi_item_detection = localData.multiItemDetection;
        }
        if ((cloudProfile?.save_scans_to_cloud === null || cloudProfile?.save_scans_to_cloud === undefined) && localData.saveScansToCloud !== undefined) {
          profileUpdatesToApply.save_scans_to_cloud = localData.saveScansToCloud;
        }

        if (Object.keys(profileUpdatesToApply).length > 0) {
          syncAttemptedCount++;
          console.log(`[CloudSync] Migrating missing profile fields to cloud:`, profileUpdatesToApply);
          try {
            await this.updateUserProfile(userId, profileUpdatesToApply);
            syncSuccessCount++;
          } catch (err) {
            console.warn(`[CloudSync ERROR] Profile fields migration failed:`, err);
            allUpsertsSucceeded = false;
          }
        }
      }

      // 2. Migrate Biometrics if missing on cloud
      if (!cloudBio && localData?.biometrics) {
        syncAttemptedCount++;
        console.log(`[CloudSync] Migrating local biometrics to cloud for user ${userId}...`);
        const bioOk = await this.saveUserBiometrics(userId, localData.biometrics);
        if (bioOk) {
          syncSuccessCount++;
        } else {
          console.warn(`[CloudSync ERROR] Biometrics migration failed for user ${userId}`);
          allUpsertsSucceeded = false;
        }
      } else if (cloudBio) {
        console.log(`[CloudSync] Cloud biometrics already exist for user ${userId}. Cloud wins.`);
      }

      // 3. Migrate Today Water Log if missing on cloud
      const guestWaterKey = `@mealpulse_water_intake_v1_guest_${todayStr}`;
      const localWaterStr = await ExpoGoSafeAsyncStorage.getItem(guestWaterKey);
      const localWaterVal = localWaterStr ? parseInt(localWaterStr, 10) : 0;

      if ((!cloudWater || cloudWater.amount_ml === undefined) && localWaterVal > 0) {
        syncAttemptedCount++;
        console.log(`[CloudSync] Migrating local guest water log (${localWaterVal} ml) to cloud for date ${todayStr}...`);
        const targetMl = localData?.waterTarget || 2500;
        const waterOk = await this.saveWaterLog(userId, todayStr, localWaterVal, targetMl);
        if (waterOk) {
          syncSuccessCount++;
          keysToRemoveOnAtomicSuccess.push(guestWaterKey);
        } else {
          console.warn(`[CloudSync ERROR] Water log upload failed for date ${todayStr}`);
          allUpsertsSucceeded = false;
        }
      } else if (cloudWater) {
        console.log(`[CloudSync] Cloud water log already exists for date ${todayStr}. Cloud wins.`);
        keysToRemoveOnAtomicSuccess.push(guestWaterKey);
      }

      // 4. Migrate any Guest Meals stored locally to user's Supabase account
      const guestMealKey = `@mealpulse_guest_meals_v1_${todayStr}`;
      const guestMealsJson = await ExpoGoSafeAsyncStorage.getItem(guestMealKey);
      if (guestMealsJson) {
        try {
          const guestMeals = JSON.parse(guestMealsJson);
          if (Array.isArray(guestMeals) && guestMeals.length > 0) {
            syncAttemptedCount++;
            console.log(`[CloudSync] Migrating ${guestMeals.length} guest meals to cloud for user ${userId}...`);
            let allMealsSaved = true;
            for (const gm of guestMeals) {
              const ok = await this.saveMealLog({
                id: gm.id,
                user_id: userId,
                food_name: gm.name,
                calories: gm.calories,
                protein_g: gm.protein,
                carbs_g: gm.carbs,
                fat_g: gm.fat,
                meal_type: gm.category || 'Dinner',
                image_url: gm.imageUri || undefined,
                logging_method: 'manual',
              });
              if (!ok) {
                console.warn(`[CloudSync ERROR] Failed to upload meal: ${gm.name}`);
                allMealsSaved = false;
              }
            }
            if (allMealsSaved) {
              syncSuccessCount++;
              keysToRemoveOnAtomicSuccess.push(guestMealKey);
            } else {
              allUpsertsSucceeded = false;
            }
          }
        } catch (gmErr) {
          console.warn('[CloudSync ERROR] Error parsing guest meals:', gmErr);
          allUpsertsSucceeded = false;
        }
      }

      // Step 5: ATOMIC COMMIT — Only remove local guest keys if ALL attempted uploads succeeded!
      if (allUpsertsSucceeded) {
        for (const k of keysToRemoveOnAtomicSuccess) {
          await ExpoGoSafeAsyncStorage.removeItem(k);
        }
        await ExpoGoSafeAsyncStorage.setItem(migrationFlagKey, 'true');
        console.log(`[CloudSync SUCCESS] Atomic migration completed cleanly (${syncSuccessCount}/${syncAttemptedCount} items migrated) for user ${userId}. All guest keys purged!`);
        return true;
      } else {
        console.warn(`[CloudSync ATOMIC GUARD] Sync incomplete (${syncSuccessCount}/${syncAttemptedCount} succeeded). NO guest keys deleted. Will retry on next session.`);
        return false;
      }
    } catch (e) {
      console.warn(`[CloudSync EXCEPTION] Error during atomic sync for user ${userId}:`, e);
      return false;
    }
  }

  /**
   * Updates user profile fields in Supabase
   */
  static async updateUserProfile(userId: string, updates: Record<string, any>) {
    try {
      const { error } = await supabase.from('profiles').update({
        ...updates,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);

      if (error) {
        console.warn('Update profile notice:', error.message);
      }
    } catch (e) {
      console.warn('Update profile error:', e);
    }
  }

  /**
   * Saves paid subscription transaction receipt & updates user profile in Supabase DB
   */
  static async saveUserSubscription(userId: string, planId: string, amountPaid: number, entitlementKey: string = 'MEALPULSEAI Pro') {
    try {
      await supabase.from('subscriptions').insert([
        {
          user_id: userId,
          plan_id: planId,
          status: 'active',
          amount_paid: amountPaid,
          provider: 'revenuecat',
          entitlement_key: entitlementKey,
          starts_at: new Date().toISOString(),
        },
      ]);

      await supabase.from('profiles').upsert([
        {
          id: userId,
          is_pro: true,
          current_plan: planId,
          updated_at: new Date().toISOString(),
        },
      ]);

      return true;
    } catch (e) {
      console.warn('Subscription save notice:', e);
      return false;
    }
  }

  /**
   * Saves or updates User Biometrics in user_biometrics table
   */
  static async saveUserBiometrics(userId: string, bio: any): Promise<boolean> {
    try {
      const { error } = await supabase.from('user_biometrics').upsert([
        {
          user_id: userId,
          gender: bio.gender || 'female',
          age: bio.age || 25,
          height_cm: bio.heightCm || bio.height_cm || 170,
          weight_kg: bio.weightKg || bio.weight_kg || 65,
          goal_weight_kg: bio.goalWeightKg || bio.goal_weight_kg || 60,
          activity_level: bio.activityLevel || bio.activity_level || 'moderate',
          primary_goal: bio.primaryGoal || bio.primary_goal || 'Lose Weight',
          allergies: bio.allergies || [],
          diet_preference: bio.dietPreference || bio.diet_preference || 'balanced',
          bmr: bio.bmr || 1500,
          tdee: bio.tdee || 2000,
          target_protein: bio.targetProtein || bio.target_protein || 120,
          target_carbs: bio.targetCarbs || bio.target_carbs || 195,
          target_fat: bio.targetFat || bio.target_fat || 58,
          target_calories: bio.tdee || bio.target_calories || 2000,
          water_target: bio.waterTarget || bio.water_target || 2500,
          updated_at: new Date().toISOString(),
        },
      ]);
      if (!error) return true;
      console.warn('saveUserBiometrics error:', error.message);
    } catch (e) {
      console.warn('Biometrics save error:', e);
    }
    return false;
  }

  /**
   * Fetches User Biometrics from user_biometrics table
   */
  static async getUserBiometrics(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_biometrics')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('getUserBiometrics notice:', e);
    }
    return null;
  }

  /**
   * Saves daily water intake log to water_logs table
   */
  static async saveWaterLog(userId: string, dateStr: string, amountMl: number, targetMl: number = 2500): Promise<boolean> {
    try {
      const { error } = await supabase.from('water_logs').upsert([
        {
          user_id: userId,
          log_date: dateStr,
          amount_ml: amountMl,
          target_ml: targetMl,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'user_id,log_date' });
      if (!error) return true;
      console.warn('saveWaterLog error:', error.message);
    } catch (e) {
      console.warn('Water log save error:', e);
    }
    return false;
  }

  /**
   * Fetches daily water log for specified date
   */
  static async getWaterLog(userId: string, dateStr: string) {
    try {
      const { data, error } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', dateStr)
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('getWaterLog notice:', e);
    }
    return null;
  }

  /**
   * Saves fasting timer session to fasting_logs table
   */
  static async saveFastingLog(userId: string, session: {
    protocol?: string;
    startTime?: string;
    endTime?: string;
    targetHours?: number;
    isCompleted?: boolean;
    isUnlockedViaAd?: boolean;
  }): Promise<boolean> {
    try {
      const { error } = await supabase.from('fasting_logs').insert([
        {
          user_id: userId,
          protocol: session.protocol || '16:8',
          start_time: session.startTime || new Date().toISOString(),
          end_time: session.endTime || null,
          target_hours: session.targetHours || 16,
          is_completed: session.isCompleted ?? false,
          is_unlocked_via_ad: session.isUnlockedViaAd ?? false,
        },
      ]);
      if (!error) return true;
      console.warn('saveFastingLog error:', error.message);
    } catch (e) {
      console.warn('Fasting log save error:', e);
    }
    return false;
  }

  /**
   * Saves promo event / spin wheel outcome to promo_events table
   */
  static async savePromoEvent(userId: string, event: {
    eventType: string;
    outcome?: string;
    discountPercent?: number;
    claimed?: boolean;
  }): Promise<boolean> {
    try {
      const { error } = await supabase.from('promo_events').insert([
        {
          user_id: userId,
          event_type: event.eventType,
          outcome: event.outcome || null,
          discount_percent: event.discountPercent || null,
          claimed: event.claimed ?? false,
        },
      ]);
      if (!error) return true;
      console.warn('savePromoEvent error:', error.message);
    } catch (e) {
      console.warn('Promo event save error:', e);
    }
    return false;
  }

  /**
   * Fetches user habits from user_habits table
   */
  static async fetchUserHabits(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_habits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (!error && data) return data;
    } catch (e) {
      console.warn('fetchUserHabits notice:', e);
    }
    return [];
  }

  /**
   * Saves a new habit to user_habits table
   */
  static async saveUserHabit(userId: string, habit: { title: string; category?: string; streak?: number; completedToday?: boolean; isProOnly?: boolean }) {
    try {
      const { data, error } = await supabase.from('user_habits').insert([
        {
          user_id: userId,
          title: habit.title,
          category: habit.category || 'General',
          streak: habit.streak || 0,
          completed_today: habit.completedToday ?? false,
          is_pro_only: habit.isProOnly ?? false,
        },
      ]).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('saveUserHabit error:', e);
    }
    return null;
  }

  /**
   * Updates habit status or streak in user_habits table
   */
  static async updateUserHabit(habitId: string, updates: Partial<{ streak: number; completed_today: boolean; title: string }>) {
    try {
      const { error } = await supabase.from('user_habits').update({
        ...updates,
        updated_at: new Date().toISOString(),
      }).eq('id', habitId);
      if (!error) return true;
    } catch (e) {
      console.warn('updateUserHabit error:', e);
    }
    return false;
  }

  /**
   * Fetches journal entries from journal_entries table
   */
  static async fetchJournalEntries(userId: string) {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });
      if (!error && data) return data;
    } catch (e) {
      console.warn('fetchJournalEntries notice:', e);
    }
    return [];
  }

  /**
   * Saves a new journal entry to journal_entries table
   */
  static async saveJournalEntry(userId: string, entry: { note: string; sentiment?: string; aiAdvice?: string }) {
    try {
      const { data, error } = await supabase.from('journal_entries').insert([
        {
          user_id: userId,
          note: entry.note,
          sentiment: entry.sentiment || 'Balanced',
          ai_advice: entry.aiAdvice || null,
        },
      ]).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('saveJournalEntry error:', e);
    }
    return null;
  }
}
