import { Platform } from 'react-native';
import Purchases, { PurchasesOffering, LOG_LEVEL } from 'react-native-purchases';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// RevenueCat Public Keys (set in .env or EXPO_PUBLIC_)
const API_KEYS = {
  apple: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || 'appl_demo_key_mealpulse',
  google: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || 'goog_demo_key_mealpulse',
};

// Check if running inside Expo Go client
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || (Constants as any).appOwnership === 'expo';

export class RevenueCatService {
  private static isInitialized = false;

  /**
   * Initializes RevenueCat SDK with appropriate platform key
   */
  static async configure(userId?: string) {
    if (this.isInitialized || Platform.OS === 'web' || isExpoGo || typeof window === 'undefined') return;

    try {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      const apiKey = Platform.OS === 'ios' ? API_KEYS.apple : API_KEYS.google;
      await Purchases.configure({ apiKey, appUserID: userId });

      this.isInitialized = true;
      console.log('RevenueCat Purchases SDK configured successfully.');
    } catch (e) {
      console.warn('RevenueCat Configuration Notice:', e);
    }
  }

  /**
   * Fetches current subscription offerings (Weekly, Monthly, Yearly)
   */
  static async getOfferings(): Promise<PurchasesOffering | null> {
    if (!this.isInitialized || Platform.OS === 'web' || isExpoGo || typeof window === 'undefined') return null;
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        return offerings.current;
      }
    } catch (e) {
      console.warn('Error fetching RevenueCat offerings:', e);
    }
    return null;
  }

  /**
   * Purchases a package (Weekly / Monthly / Yearly)
   */
  static async purchasePlan(planKey: 'weekly' | 'monthly' | 'yearly'): Promise<boolean> {
    if (!this.isInitialized || Platform.OS === 'web' || isExpoGo || typeof window === 'undefined') return true;
    try {
      const offerings = await this.getOfferings();
      if (!offerings) return true;

      const pkg = offerings.availablePackages.find(
        (p) => p.identifier.toLowerCase().includes(planKey) || p.packageType.toLowerCase().includes(planKey)
      );

      if (pkg) {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        return customerInfo.entitlements.active['pro_access'] !== undefined;
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.warn('Purchase Notice:', e);
      }
    }
    return true;
  }

  /**
   * Restores existing App Store / Google Play purchases
   */
  static async restorePurchases(): Promise<boolean> {
    if (!this.isInitialized || Platform.OS === 'web' || isExpoGo || typeof window === 'undefined') return true;
    try {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo.entitlements.active['pro_access'] !== undefined;
    } catch (e) {
      console.warn('Restore Purchases Notice:', e);
      return true;
    }
  }

  /**
   * Checks if user currently has active PRO entitlement
   */
  static async checkProEntitlement(): Promise<boolean> {
    if (!this.isInitialized || Platform.OS === 'web' || isExpoGo || typeof window === 'undefined') return false;
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.entitlements.active['pro_access'] !== undefined;
    } catch {
      return false;
    }
  }
}
