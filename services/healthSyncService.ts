import { Platform, Linking } from 'react-native';
import { ExpoGoSafeAsyncStorage, SupabaseService, DailyActivityCloud } from '@/services/supabaseService';

export interface ManualWorkoutEntry {
  id: string;
  type: string;
  calories: number;
  steps: number;
  minutes: number;
  loggedAt: string;
}

export interface DailyHealthActivity {
  activeCalories: number;
  steps: number;
  exerciseMinutes: number;
  distanceMeters?: number;
  lastSyncedAt: string;
  source: 'apple_health' | 'health_connect' | 'manual';
  manualWorkouts?: ManualWorkoutEntry[];
}

export type HealthSyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'unauthorized' | 'not_supported';

const STORAGE_KEY_PREFIX = '@mealpulse_health_activity_';
const STORAGE_KEY_MANUAL_WORKOUTS_PREFIX = '@mealpulse_manual_workouts_v2_';
const STORAGE_KEY_NATIVE_CACHE_PREFIX = '@mealpulse_native_health_v2_';
const STORAGE_KEY_LAST_SYNC = '@mealpulse_health_last_sync';
const STORAGE_KEY_SYNC_ENABLED = '@mealpulse_health_sync_enabled';
const STORAGE_KEY_INCLUDE_BUDGET = '@mealpulse_health_include_budget';

export class HealthSyncService {
  /**
   * Helper to format Date to YYYY-MM-DD local string
   */
  static getTodayDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Checks if native Health framework is supported on current OS/device
   */
  static async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    if (Platform.OS === 'android') {
      try {
        const { getSdkStatus, SdkAvailabilityStatus } = require('react-native-health-connect');
        const status = await getSdkStatus();
        return status === SdkAvailabilityStatus.SDK_AVAILABLE;
      } catch {
        return false;
      }
    }
    return Platform.OS === 'ios';
  }

  /**
   * Universal helper to launch any native app or open its Store/Settings fallback safely without crash
   */
  static async openAppOrStore(packageName: string, schemeUrl?: string, webFallback?: string): Promise<boolean> {
    if (Platform.OS === 'android') {
      // 1. Try custom URI scheme if provided
      if (schemeUrl) {
        try {
          await Linking.openURL(schemeUrl);
          return true;
        } catch {}
      }

      // 2. Try Android intent URL
      try {
        const intentUrl = `intent:#Intent;package=${packageName};end`;
        await Linking.openURL(intentUrl);
        return true;
      } catch {}

      // 3. Fallback to Google Play Store page
      try {
        await Linking.openURL(`market://details?id=${packageName}`);
        return true;
      } catch {}

      // 4. Web Play Store fallback
      if (webFallback) {
        try {
          await Linking.openURL(webFallback);
          return true;
        } catch {}
      }
    } else if (Platform.OS === 'ios') {
      if (schemeUrl) {
        try {
          await Linking.openURL(schemeUrl);
          return true;
        } catch {}
      }
      if (webFallback) {
        try {
          await Linking.openURL(webFallback);
          return true;
        } catch {}
      }
    }
    return false;
  }

  /**
   * Opens Health Connect settings
   */
  static async openHealthConnect(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const { openHealthConnectSettings } = require('react-native-health-connect');
        if (typeof openHealthConnectSettings === 'function') {
          openHealthConnectSettings();
          return true;
        }
      } catch {}

      try {
        await Linking.openURL('intent:#Intent;action=androidx.health.ACTION_HEALTH_CONNECT_SETTINGS;end');
        return true;
      } catch {}

      try {
        await Linking.openURL('intent:#Intent;action=android.settings.HEALTH_CONNECT_SETTINGS;end');
        return true;
      } catch {}

      return await HealthSyncService.openAppOrStore('com.google.android.apps.healthdata', undefined, 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata');
    }
    return false;
  }

  /**
   * Opens Samsung Health
   */
  static async openSamsungHealth(): Promise<boolean> {
    return await HealthSyncService.openAppOrStore(
      'com.sec.android.app.shealth',
      'samsunghealth://',
      'https://play.google.com/store/apps/details?id=com.sec.android.app.shealth'
    );
  }

  /**
   * Opens Google Fit
   */
  static async openGoogleFit(): Promise<boolean> {
    return await HealthSyncService.openAppOrStore(
      'com.google.android.apps.fitness',
      'googlefit://',
      'https://play.google.com/store/apps/details?id=com.google.android.apps.fitness'
    );
  }

  /**
   * Opens Xiaomi Mi Fitness / Zepp
   */
  static async openXiaomiFitness(): Promise<boolean> {
    const miSuccess = await HealthSyncService.openAppOrStore(
      'com.xiaomi.wearable',
      'mifitness://',
      'https://play.google.com/store/apps/details?id=com.xiaomi.wearable'
    );
    if (!miSuccess) {
      return await HealthSyncService.openAppOrStore(
        'com.huami.watch.hmwatchmanager',
        'zepp://',
        'https://play.google.com/store/apps/details?id=com.huami.watch.hmwatchmanager'
      );
    }
    return true;
  }

  /**
   * Opens Huawei Health
   */
  static async openHuaweiHealth(): Promise<boolean> {
    return await HealthSyncService.openAppOrStore(
      'com.huawei.health',
      'huaweihealth://',
      'https://appgallery.huawei.com/app/C10414141'
    );
  }

  /**
   * Opens Garmin Connect
   */
  static async openGarminConnect(): Promise<boolean> {
    return await HealthSyncService.openAppOrStore(
      'com.garmin.android.apps.connectmobile',
      'gcm://',
      'https://play.google.com/store/apps/details?id=com.garmin.android.apps.connectmobile'
    );
  }

  /**
   * Opens Fitbit
   */
  static async openFitbit(): Promise<boolean> {
    return await HealthSyncService.openAppOrStore(
      'com.fitbit.FitbitMobile',
      'fitbit://',
      'https://play.google.com/store/apps/details?id=com.fitbit.FitbitMobile'
    );
  }

  /**
   * Opens Strava
   */
  static async openStrava(): Promise<boolean> {
    return await HealthSyncService.openAppOrStore(
      'com.strava',
      'strava://',
      'https://play.google.com/store/apps/details?id=com.strava'
    );
  }

  /**
   * Opens Apple Health (iOS)
   */
  static async openAppleHealth(): Promise<boolean> {
    try {
      await Linking.openURL('x-apple-health://');
      return true;
    } catch {
      await Linking.openSettings();
      return true;
    }
  }

  /**
   * Opens native Health Connect / Health app settings with zero crash risk
   */
  static async openHealthSettings(): Promise<boolean> {
    if (Platform.OS === 'android') {
      return await HealthSyncService.openHealthConnect();
    } else if (Platform.OS === 'ios') {
      return await HealthSyncService.openAppleHealth();
    }
    return false;
  }

  /**
   * Requests authorization to read active calories burned, steps, and exercise minutes
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return false;

      if (Platform.OS === 'android') {
        try {
          const {
            initialize,
            requestPermission,
            getSdkStatus,
            SdkAvailabilityStatus,
          } = require('react-native-health-connect');

          const status = await getSdkStatus();
          if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
            console.warn('[HealthSyncService] Health Connect SDK status:', status);
            return false;
          }

          await initialize();

          const grantedPermissions = await requestPermission([
            { accessType: 'read', recordType: 'Steps' },
            { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
            { accessType: 'read', recordType: 'TotalCaloriesBurned' },
            { accessType: 'read', recordType: 'ExerciseSession' },
            { accessType: 'read', recordType: 'Distance' },
          ]);

          console.log('[HealthSyncService] Granted permissions from Health Connect:', grantedPermissions);
          await ExpoGoSafeAsyncStorage.setItem(STORAGE_KEY_SYNC_ENABLED, 'true');
          return true;
        } catch (androidErr) {
          console.warn('[HealthSyncService] Android requestPermission notice:', androidErr);
          await ExpoGoSafeAsyncStorage.setItem(STORAGE_KEY_SYNC_ENABLED, 'true');
          return true;
        }
      }

      await ExpoGoSafeAsyncStorage.setItem(STORAGE_KEY_SYNC_ENABLED, 'true');
      return true;
    } catch (err) {
      console.warn('[HealthSyncService] Permission request failed:', err);
      return false;
    }
  }

  /**
   * Gets list of manual workouts for a given date
   */
  static async getManualWorkouts(dateStr: string = HealthSyncService.getTodayDateString()): Promise<ManualWorkoutEntry[]> {
    try {
      const raw = await ExpoGoSafeAsyncStorage.getItem(`${STORAGE_KEY_MANUAL_WORKOUTS_PREFIX}${dateStr}`);
      if (raw) {
        return JSON.parse(raw) as ManualWorkoutEntry[];
      }
    } catch (e) {
      console.warn('[HealthSyncService] getManualWorkouts error:', e);
    }
    return [];
  }

  /**
   * Gets cached activity from local storage
   */
  static async getCachedActivity(dateStr: string = HealthSyncService.getTodayDateString()): Promise<DailyHealthActivity | null> {
    try {
      const raw = await ExpoGoSafeAsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${dateStr}`);
      if (raw) {
        return JSON.parse(raw) as DailyHealthActivity;
      }
    } catch (e) {
      console.warn('[HealthSyncService] getCachedActivity error:', e);
    }
    return null;
  }

  /**
   * Fetches native raw data from Android Health Connect for a specific date
   */
  private static async fetchAndroidNativeData(targetDate: Date = new Date()): Promise<{
    steps: number;
    activeCalories: number;
    exerciseMinutes: number;
    distanceMeters: number;
    success: boolean;
  }> {
    let steps = 0;
    let activeCalories = 0;
    let totalCalories = 0;
    let exerciseMinutes = 0;
    let distanceMeters = 0;
    let success = false;

    try {
      const {
        initialize,
        aggregateRecord,
        readRecords,
        getSdkStatus,
        SdkAvailabilityStatus,
      } = require('react-native-health-connect');

      const status = await getSdkStatus();
      if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        return { steps, activeCalories, exerciseMinutes, distanceMeters, success: false };
      }

      await initialize();

      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
      const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

      const timeRangeBetween = {
        operator: 'between' as const,
        startTime: startOfDay.toISOString(),
        endTime: endOfDay.toISOString(),
      };

      const isRecordTargetDay = (r: any): boolean => {
        if (!r.startTime) return true;
        const d = new Date(r.startTime);
        const recordDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return recordDateStr === targetDateStr;
      };

      // 1. STEPS: Multi-source resolution
      let aggSteps = 0;
      try {
        const stepAgg = await aggregateRecord({
          recordType: 'Steps',
          timeRangeFilter: timeRangeBetween,
        });
        if (stepAgg && typeof stepAgg.COUNT_TOTAL === 'number' && stepAgg.COUNT_TOTAL > 0) {
          aggSteps = Math.round(stepAgg.COUNT_TOTAL);
        }
      } catch (e) {
        console.warn(`[HEALTH-SYNC-DEBUG] Steps aggregate error for ${targetDateStr}:`, e);
      }

      let rawStepsSum = 0;
      const stepsBySource: Record<string, number> = {};
      const stepsByDevice: Record<string, number> = {};

      try {
        const stepRecs = await readRecords('Steps', { timeRangeFilter: timeRangeBetween, pageSize: 5000 });
        const recordsList = (stepRecs?.records || []).filter(isRecordTargetDay);

        recordsList.forEach((r: any) => {
          const count = Number(r.count || r.steps || 0);
          rawStepsSum += count;
          const appSource = r.metadata?.dataOrigin || 'unknown_app';
          const deviceModel = r.metadata?.model || r.metadata?.manufacturer || 'unknown_device';
          stepsBySource[appSource] = (stepsBySource[appSource] || 0) + count;
          stepsByDevice[deviceModel] = (stepsByDevice[deviceModel] || 0) + count;
        });
      } catch (e) {
        console.warn(`[HEALTH-SYNC-DEBUG] Steps readRecords error for ${targetDateStr}:`, e);
      }

      let maxSourceSteps = 0;
      for (const cnt of Object.values(stepsBySource)) {
        if (cnt > maxSourceSteps) maxSourceSteps = cnt;
      }

      steps = Math.max(aggSteps, maxSourceSteps, rawStepsSum);
      if (steps > 0) success = true;

      // 2. ACTIVE CALORIES BURNED
      let aggActiveCal = 0;
      try {
        const activeCalAgg = await aggregateRecord({
          recordType: 'ActiveCaloriesBurned',
          timeRangeFilter: timeRangeBetween,
        });
        if (activeCalAgg && activeCalAgg.ACTIVE_CALORIES_TOTAL?.inKilocalories) {
          aggActiveCal = Math.round(activeCalAgg.ACTIVE_CALORIES_TOTAL.inKilocalories);
        }
      } catch (e) {}

      let rawActiveCalSum = 0;
      const calBySource: Record<string, number> = {};

      try {
        const calRecs = await readRecords('ActiveCaloriesBurned', { timeRangeFilter: timeRangeBetween, pageSize: 5000 });
        if (calRecs?.records && calRecs.records.length > 0) {
          const targetCalRecs = calRecs.records.filter(isRecordTargetDay);
          for (const r of targetCalRecs) {
            const energy = Number(r.energy?.inKilocalories || 0);
            rawActiveCalSum += energy;
            const src = r.metadata?.dataOrigin || 'default';
            calBySource[src] = (calBySource[src] || 0) + energy;
          }
        }
      } catch (e) {}

      let maxSourceActiveCal = 0;
      for (const cnt of Object.values(calBySource)) {
        if (cnt > maxSourceActiveCal) maxSourceActiveCal = cnt;
      }

      activeCalories = Math.max(aggActiveCal, maxSourceActiveCal, Math.round(rawActiveCalSum));
      if (activeCalories > 0) success = true;

      // 3. TOTAL CALORIES BURNED (supplementary)
      try {
        const totalCalAgg = await aggregateRecord({
          recordType: 'TotalCaloriesBurned',
          timeRangeFilter: timeRangeBetween,
        });
        if (totalCalAgg && totalCalAgg.ENERGY_TOTAL?.inKilocalories) {
          totalCalories = Math.round(totalCalAgg.ENERGY_TOTAL.inKilocalories);
        }
      } catch (e) {}

      // 4. EXERCISE SESSIONS (Minutes)
      let aggExerciseMin = 0;
      try {
        const exAgg = await aggregateRecord({
          recordType: 'ExerciseSession',
          timeRangeFilter: timeRangeBetween,
        });
        if (exAgg && exAgg.EXERCISE_DURATION_TOTAL?.inSeconds) {
          aggExerciseMin = Math.round(exAgg.EXERCISE_DURATION_TOTAL.inSeconds / 60);
        }
      } catch (e) {}

      let rawExerciseMin = 0;
      try {
        const exRecs = await readRecords('ExerciseSession', { timeRangeFilter: timeRangeBetween, pageSize: 5000 });
        if (exRecs?.records && exRecs.records.length > 0) {
          const targetExRecs = exRecs.records.filter(isRecordTargetDay);
          const totalSec = targetExRecs.reduce((acc: number, r: any) => {
            const start = new Date(r.startTime).getTime();
            const end = new Date(r.endTime).getTime();
            return acc + Math.max(0, (end - start) / 1000);
          }, 0);
          rawExerciseMin = Math.round(totalSec / 60);
        }
      } catch (e) {}

      exerciseMinutes = Math.max(aggExerciseMin, rawExerciseMin);
      if (exerciseMinutes > 0) success = true;

      // Active calories estimation from steps if not tracked directly (~0.055 kcal/step)
      if (activeCalories === 0 && steps > 0) {
        activeCalories = Math.max(1, Math.round(steps * 0.055));
        success = true;
      }

      // Exercise minutes estimation from steps cadence (~110 steps/min)
      if (exerciseMinutes === 0 && steps > 0) {
        exerciseMinutes = Math.max(1, Math.round(steps / 110));
      }

      // 5. DISTANCE
      try {
        const distAgg = await aggregateRecord({
          recordType: 'Distance',
          timeRangeFilter: timeRangeBetween,
        });
        if (distAgg && distAgg.DISTANCE?.inMeters) {
          distanceMeters = Math.round(distAgg.DISTANCE.inMeters);
        }
      } catch (e) {}

      if (distanceMeters === 0 && steps > 0) {
        distanceMeters = Math.round(steps * 0.75);
      }
    } catch (err) {
      console.warn(`[HEALTH-SYNC-DEBUG] fetchAndroidNativeData error:`, err);
    }

    return { steps, activeCalories, exerciseMinutes, distanceMeters, success };
  }

  /**
   * Parses date input into a Date object and YYYY-MM-DD string
   */
  static parseDateInput(dateInput?: Date | string): { dateObj: Date; dateStr: string } {
    if (!dateInput) {
      const now = new Date();
      return { dateObj: now, dateStr: HealthSyncService.getTodayDateString(now) };
    }
    if (typeof dateInput === 'string') {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d, 12, 0, 0);
        return { dateObj, dateStr: dateInput };
      }
      const parsed = new Date(dateInput);
      return { dateObj: parsed, dateStr: HealthSyncService.getTodayDateString(parsed) };
    }
    return { dateObj: dateInput, dateStr: HealthSyncService.getTodayDateString(dateInput) };
  }

  /**
   * Fetches total active calories burned, steps, and active minutes for ANY given date:
   * Total = Native Hardware Sync (Health Connect / HealthKit) + All Manual Logged Workouts for that date
   * Also checks Cloud Supabase backup if local device has no cached reading.
   */
  static async fetchActivityForDate(dateInput?: Date | string, userId?: string): Promise<DailyHealthActivity> {
    const { dateObj, dateStr } = HealthSyncService.parseDateInput(dateInput);
    const source = Platform.OS === 'ios' ? 'apple_health' : 'health_connect';

    let nativeSteps = 0;
    let nativeCalories = 0;
    let nativeMinutes = 0;
    let nativeDistance = 0;

    // 1. Query Native Health Connect on Android for this specific date
    if (Platform.OS === 'android') {
      const nativeRes = await HealthSyncService.fetchAndroidNativeData(dateObj);
      if (nativeRes.success) {
        nativeSteps = nativeRes.steps;
        nativeCalories = nativeRes.activeCalories;
        nativeMinutes = nativeRes.exerciseMinutes;
        nativeDistance = nativeRes.distanceMeters;

        // Cache native reading
        await ExpoGoSafeAsyncStorage.setItem(
          `${STORAGE_KEY_NATIVE_CACHE_PREFIX}${dateStr}`,
          JSON.stringify({
            steps: nativeSteps,
            activeCalories: nativeCalories,
            exerciseMinutes: nativeMinutes,
            distanceMeters: nativeDistance,
            syncedAt: new Date().toISOString(),
          })
        );
      } else {
        // Try local cached native reading
        try {
          const cachedNativeRaw = await ExpoGoSafeAsyncStorage.getItem(`${STORAGE_KEY_NATIVE_CACHE_PREFIX}${dateStr}`);
          if (cachedNativeRaw) {
            const cachedNative = JSON.parse(cachedNativeRaw);
            nativeSteps = cachedNative.steps || 0;
            nativeCalories = cachedNative.activeCalories || 0;
            nativeMinutes = cachedNative.exerciseMinutes || 0;
            nativeDistance = cachedNative.distanceMeters || 0;
          }
        } catch {}
      }
    } else if (Platform.OS === 'ios') {
      const cached = await HealthSyncService.getCachedActivity(dateStr);
      if (cached) {
        nativeSteps = cached.steps;
        nativeCalories = cached.activeCalories;
        nativeMinutes = cached.exerciseMinutes;
        nativeDistance = cached.distanceMeters || 0;
      }
    }

    // 2. Load all Manual Logged Workouts for this date
    const manualWorkouts = await HealthSyncService.getManualWorkouts(dateStr);
    const manualCalories = manualWorkouts.reduce((acc, w) => acc + (w.calories || 0), 0);
    const manualSteps = manualWorkouts.reduce((acc, w) => acc + (w.steps || 0), 0);
    const manualMinutes = manualWorkouts.reduce((acc, w) => acc + (w.minutes || 0), 0);
    const manualDistance = Math.round(manualSteps * 0.75);

    // 3. Compute Cumulative Total for this date
    let totalCalories = nativeCalories + manualCalories;
    let totalSteps = nativeSteps + manualSteps;
    let totalMinutes = nativeMinutes + manualMinutes;
    let totalDistance = nativeDistance + manualDistance;

    // 4. If total is 0 and we have a logged-in user, check Supabase Cloud DB for this date
    if (totalCalories === 0 && totalSteps === 0 && userId) {
      try {
        const cloudData = await SupabaseService.getDailyActivity(userId, dateStr);
        if (cloudData && (cloudData.active_calories > 0 || cloudData.steps > 0)) {
          totalCalories = Number(cloudData.active_calories || 0);
          totalSteps = Number(cloudData.steps || 0);
          totalMinutes = Number(cloudData.exercise_minutes || 0);
          totalDistance = Math.round(totalSteps * 0.75);
        }
      } catch (e) {
        console.warn(`[HealthSyncService] Cloud fetch for ${dateStr} notice:`, e);
      }
    }

    const activityData: DailyHealthActivity = {
      activeCalories: totalCalories,
      steps: totalSteps,
      exerciseMinutes: totalMinutes,
      distanceMeters: totalDistance,
      lastSyncedAt: new Date().toISOString(),
      source: manualWorkouts.length > 0 && nativeCalories === 0 ? 'manual' : source,
      manualWorkouts,
    };

    // Save combined total to local cache for this specific date
    await ExpoGoSafeAsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${dateStr}`,
      JSON.stringify(activityData)
    );
    await ExpoGoSafeAsyncStorage.setItem(STORAGE_KEY_LAST_SYNC, activityData.lastSyncedAt);

    // Sync to Supabase Cloud DB if userId is available
    if (userId && (totalCalories > 0 || totalSteps > 0 || manualWorkouts.length > 0)) {
      try {
        await SupabaseService.upsertDailyActivity({
          user_id: userId,
          log_date: dateStr,
          active_calories: totalCalories,
          steps: totalSteps,
          exercise_minutes: totalMinutes,
          source: activityData.source,
        });
      } catch (e) {
        console.warn(`[HealthSyncService] Cloud upsert for ${dateStr} notice:`, e);
      }
    }

    return activityData;
  }

  /**
   * Fetches today's total active calories burned, steps, and active minutes
   */
  static async fetchTodayActivity(userId?: string): Promise<DailyHealthActivity> {
    return HealthSyncService.fetchActivityForDate(new Date(), userId);
  }

  /**
   * Synchronizes daily activity for a specific date with Supabase
   */
  static async syncDailyActivity(userId?: string, dateInput?: Date | string): Promise<DailyHealthActivity> {
    return HealthSyncService.fetchActivityForDate(dateInput || new Date(), userId);
  }

  /**
   * Synchronizes recent history (e.g. past 7 days) across native sensors, local cache & Supabase
   */
  static async syncRecentDaysActivity(userId?: string, daysCount: number = 7): Promise<Record<string, DailyHealthActivity>> {
    const results: Record<string, DailyHealthActivity> = {};
    const now = new Date();

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12, 0, 0);
      const dateStr = HealthSyncService.getTodayDateString(d);
      try {
        const act = await HealthSyncService.fetchActivityForDate(d, userId);
        results[dateStr] = act;
      } catch (e) {
        console.warn(`[HealthSyncService] syncRecentDaysActivity failed for ${dateStr}:`, e);
      }
    }

    return results;
  }

  /**
   * Manually logs a workout or activity (Running, Gym, Walking, etc.) for ANY date
   * Persists into manual workouts list AND updates Supabase cloud immediately.
   */
  static async addManualActivity(
    workoutType: string,
    calories: number,
    steps: number = 0,
    minutes: number = 0,
    userId?: string,
    dateInput?: Date | string
  ): Promise<DailyHealthActivity> {
    const { dateStr } = HealthSyncService.parseDateInput(dateInput);

    // 1. Create unique manual workout record
    const newEntry: ManualWorkoutEntry = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: workoutType || 'Custom Workout',
      calories: Math.max(0, Math.round(calories)),
      steps: Math.max(0, Math.round(steps)),
      minutes: Math.max(0, Math.round(minutes)),
      loggedAt: new Date().toISOString(),
    };

    // 2. Append to persistent manual workouts storage for this date
    const currentList = await HealthSyncService.getManualWorkouts(dateStr);
    const updatedList = [...currentList, newEntry];
    await ExpoGoSafeAsyncStorage.setItem(
      `${STORAGE_KEY_MANUAL_WORKOUTS_PREFIX}${dateStr}`,
      JSON.stringify(updatedList)
    );

    // 3. Recompute cumulative total with native data + all manual workouts for this date & save to Supabase
    const fullActivity = await HealthSyncService.fetchActivityForDate(dateStr, userId);
    return fullActivity;
  }

  /**
   * Reads persistent settings for Health Sync
   */
  static async getSettings(): Promise<{ isEnabled: boolean; includeInBudget: boolean }> {
    const enabledRaw = await ExpoGoSafeAsyncStorage.getItem(STORAGE_KEY_SYNC_ENABLED);
    const includeRaw = await ExpoGoSafeAsyncStorage.getItem(STORAGE_KEY_INCLUDE_BUDGET);

    return {
      isEnabled: enabledRaw === 'true',
      includeInBudget: includeRaw !== 'false', // default true
    };
  }

  /**
   * Saves persistent settings for Health Sync
   */
  static async saveSettings(isEnabled: boolean, includeInBudget: boolean): Promise<void> {
    await ExpoGoSafeAsyncStorage.setItem(STORAGE_KEY_SYNC_ENABLED, isEnabled ? 'true' : 'false');
    await ExpoGoSafeAsyncStorage.setItem(STORAGE_KEY_INCLUDE_BUDGET, includeInBudget ? 'true' : 'false');
  }
}
