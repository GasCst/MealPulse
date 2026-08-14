// TODO: Consolidate RevenueCatService and PurchaseService into one authoritative purchase service.

import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesPackage,
  PurchasesOffering,
  MakePurchaseResult,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Platform } from 'react-native';

export const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ||
  process.env.EXPO_PUBLIC_REVENUECAT_KEY ||
  'goog_YxUeSuCRkVKXHdqmsItCZscxTMF';

export const ENTITLEMENT_ID = 'MEALPULSEAI Pro';
export const PRO_ENTITLEMENT_KEYS = ['MEALPULSEAI Pro', 'pro', 'MEALPULSEAI_Pro', 'pro_access'];

export class PurchaseService {
  private static isInitialized = false;

  /**
   * 1. Configures RevenueCat Purchases SDK
   */
  static async init(appUserID?: string): Promise<CustomerInfo | null> {
    if (this.isInitialized) return null;

    try {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: appUserID || undefined,
      });

      this.isInitialized = true;
      console.log('[RevenueCat] SDK Initialized with Key:', REVENUECAT_API_KEY);

      const customerInfo = await Purchases.getCustomerInfo().catch(() => null);
      return customerInfo;
    } catch (e: any) {
      console.warn('[RevenueCat] Configuration notice (Replace placeholder API key with real goog_ key in RevenueCat dashboard):', e.message || e);
      return null;
    }
  }

  /**
   * 2. Checks if user has active entitlement for PRO
   */
  static isEntitledToPro(customerInfo: CustomerInfo | null): boolean {
    if (!customerInfo) return false;
    const active = customerInfo.entitlements.active;
    return PRO_ENTITLEMENT_KEYS.some((key) => active[key] !== undefined);
  }

  /**
   * 3. Fetches available Offerings and Packages
   */
  static async getOfferings(): Promise<{
    currentOffering: PurchasesOffering | null;
    packages: PurchasesPackage[];
    jackpotPackage: PurchasesPackage | null;
  }> {
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;

      let packages: PurchasesPackage[] = [];
      let jackpotPackage: PurchasesPackage | null = null;

      if (current) {
        packages = current.availablePackages;
        // Search for jackpot / 80% off / active custom package
        jackpotPackage =
          packages.find(
            (p) =>
              p.identifier.includes('80') ||
              p.product.identifier.includes('80') ||
              p.product.identifier === 'weekly_499' ||
              p.packageType === 'CUSTOM'
          ) || null;
      }

      return {
        currentOffering: current,
        packages,
        jackpotPackage,
      };
    } catch (e: any) {
      console.warn('[RevenueCat] Fetch Offerings Error:', e.message || e);
      return { currentOffering: null, packages: [], jackpotPackage: null };
    }
  }

  /**
   * 4. Executes Purchase of a specific Package (Weekly, Monthly, Yearly, 80% Off)
   */
  static async purchasePackage(pkg: PurchasesPackage): Promise<{
    success: boolean;
    customerInfo: CustomerInfo | null;
    userCancelled: boolean;
  }> {
    try {
      const purchaseResult: MakePurchaseResult = await Purchases.purchasePackage(pkg);
      const isPro = this.isEntitledToPro(purchaseResult.customerInfo);
      return {
        success: isPro,
        customerInfo: purchaseResult.customerInfo,
        userCancelled: false,
      };
    } catch (e: any) {
      if (e.userCancelled) {
        return { success: false, customerInfo: null, userCancelled: true };
      }
      console.error('[RevenueCat] Purchase Error:', e);
      return { success: false, customerInfo: null, userCancelled: false };
    }
  }

  /**
   * 5. Restores Previous Purchases
   */
  static async restorePurchases(): Promise<{
    isPro: boolean;
    customerInfo: CustomerInfo | null;
  }> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPro = this.isEntitledToPro(customerInfo);
      return { isPro, customerInfo };
    } catch (e: any) {
      console.warn('[RevenueCat] Restore Error:', e.message || e);
      return { isPro: false, customerInfo: null };
    }
  }

  /**
   * 6. Present RevenueCat Native Paywall Component
   */
  static async presentPaywall(): Promise<boolean> {
    try {
      const result = await RevenueCatUI.presentPaywall();
      return (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      );
    } catch (e: any) {
      console.warn('[RevenueCat Paywall Error]', e);
      return false;
    }
  }

  /**
   * 7. Present RevenueCat Customer Center for Subscription Self-Service Management
   */
  static async presentCustomerCenter(): Promise<void> {
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e: any) {
      console.warn('[RevenueCat Customer Center Notice]', e.message || e);
    }
  }

  /**
   * 8. Listens for Realtime Customer Info Changes (e.g. renewals, cancellations)
   */
  static addCustomerInfoUpdateListener(callback: (info: CustomerInfo) => void) {
    return Purchases.addCustomerInfoUpdateListener(callback);
  }
}
