// Web fallback for PurchaseService

export const REVENUECAT_API_KEY = '';
export const ENTITLEMENT_ID = 'MEALPULSEAI Pro';
export const PRO_ENTITLEMENT_KEYS = ['MEALPULSEAI Pro', 'pro', 'MEALPULSEAI_Pro', 'pro_access'];

export class PurchaseService {
  static async init(appUserID?: string) {
    return Promise.resolve(null);
  }

  static isEntitledToPro(customerInfo: any | null): boolean {
    return false;
  }

  static async getOfferings() {
    return Promise.resolve({
      currentOffering: null,
      packages: [],
      jackpotPackage: null,
    });
  }

  static async purchasePackage(pkg: any) {
    return Promise.resolve({
      success: false,
      customerInfo: null,
      userCancelled: false,
    });
  }

  static async restorePurchases() {
    return Promise.resolve({
      isPro: false,
      customerInfo: null,
    });
  }

  static async checkProStatus() {
    return Promise.resolve(false);
  }

  static async presentPaywall(): Promise<boolean> {
    return Promise.resolve(false);
  }

  static async presentCustomerCenter(): Promise<void> {
    return Promise.resolve();
  }

  static addCustomerInfoUpdateListener(callback: (info: any) => void) {
    return {
      remove: () => {},
    };
  }
}
