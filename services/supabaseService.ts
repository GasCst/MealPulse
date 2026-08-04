import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bjnqebnaboxufnxkngjb.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqbnFlYm5hYm94dWZueGtuZ2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzA0NjMsImV4cCI6MjEwMDgwNjQ2M30.UmzVcEv8KnGS70iKvUa0CCTpMMdWdO2WWI6GQVb1oiQ';

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
  user_id?: string;
  food_name: string;
  estimated_weight_g?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: string;
  logged_at: string;
  image_url?: string;
}

export class SupabaseService {
  /**
   * Syncs meal log to cloud database per user
   */
  static async saveMealLog(meal: Omit<CloudMealLog, 'id' | 'logged_at'>): Promise<boolean> {
    try {
      const { error } = await supabase.from('meal_logs').insert([
        {
          ...meal,
          logged_at: new Date().toISOString(),
        },
      ]);
      if (!error) return true;
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
    } catch (e) {
      console.warn('Supabase delete notice:', e);
    }
    return false;
  }

  /**
   * Fetches user meal history for a specific date (YYYY-MM-DD)
   */
  static async fetchMealLogsByUserAndDate(userId?: string, targetDate?: string): Promise<CloudMealLog[]> {
    try {
      let query = supabase.from('meal_logs').select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

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
    try {
      let query = supabase.from('meal_logs').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query.order('logged_at', { ascending: false });
      if (!error && data) {
        return data as CloudMealLog[];
      }
    } catch (e) {
      console.warn('Supabase history fetch error:', e);
    }
    return [];
  }

  /**
   * Fetches user profile entitlement (is_pro, current_plan) from cloud DB
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

      const { data, error } = await supabase.from('profiles').upsert([
        {
          id: user.id,
          email: email,
          full_name: fullName,
          is_pro: existing?.is_pro ?? false,
          current_plan: existing?.current_plan ?? null,
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
   * Saves paid subscription transaction receipt & updates user profile in Supabase DB
   */
  static async saveUserSubscription(userId: string, planId: string, amountPaid: number) {
    try {
      // 1. Insert into subscriptions table
      await supabase.from('subscriptions').insert([
        {
          user_id: userId,
          plan_id: planId,
          status: 'active',
          amount_paid: amountPaid,
        },
      ]);

      // 2. Upsert user profile to set is_pro = true
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
   * Updates user profile fields in Supabase
   */
  static async updateUserProfile(userId: string, updates: Record<string, any>) {
    try {
      await supabase.from('profiles').update({
        ...updates,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    } catch (e) {
      console.warn('Update profile error:', e);
    }
  }
}
