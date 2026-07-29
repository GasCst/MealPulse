import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || (Constants as any).appOwnership === 'expo';

// Set default notification handler
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Expo Go notice
}

export class NotificationService {
  /**
   * Requests permissions and configures push notifications
   */
  static async requestPermissions(): Promise<boolean> {
    if (isExpoGo || Platform.OS === 'web') {
      console.log('Expo Go / Web client active: Push Notifications require Development Build.');
      return false;
    }
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push Notification permissions not granted.');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'MealPulse AI Daily Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#BEF264',
        });
      }

      // Schedule daily notification suite
      await this.scheduleDailyMealReminders();
      return true;
    } catch (e) {
      console.warn('Error setting up notifications:', e);
      return false;
    }
  }

  /**
   * Schedules recurring daily meal and hydration reminders
   */
  static async scheduleDailyMealReminders() {
    try {
      // Cancel previous scheduled notifications to avoid duplicates
      await Notifications.cancelAllScheduledNotificationsAsync();

      // 1. Morning Breakfast Prompt (08:30 AM)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍳 Good Morning! Snap Breakfast Photo',
          body: 'Take 2 seconds to scan your plate & log your protein target.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 8,
          minute: 30,
        },
      });

      // 2. Afternoon Hydration Check-in (02:00 PM)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Hydration Time!',
          body: 'You are 3 glasses away from your 2,500ml water goal today.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 14,
          minute: 0,
        },
      });

      // 3. Evening Calorie Goal Review (08:00 PM)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Daily Calorie & Macro Check-in',
          body: 'Review today’s logged meals and hit your target streak!',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
        },
      });

      console.log('Daily meal & hydration notifications scheduled successfully.');
    } catch (e) {
      console.warn('Expo Go Notifications notice (use Dev Client for background push):', e);
    }
  }
}
