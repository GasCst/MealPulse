// Web fallback for PurchaseService

export const REVENUECAT_API_KEY = '';
export const ENTITLEMENT_ID = 'MEALPULSEAI Pro';
export const PRO_ENTITLEMENT_KEYS = ['MEALPULSEAI Pro', 'pro', 'MEALPULSEAI_Pro', 'pro_access'];

export class PurchaseService {
  static async init() {
    return Promise.resolve(null);
  }

  static isEntitledToPro() {
    return false;
  }

  static async getOfferings() {
    return Promise.resolve(null);
  }

  static async purchasePackage() {
    return Promise.resolve({ success: false, isPro: false });
  }

  static async restorePurchases() {
    return Promise.resolve({ success: false, isPro: false });
  }

  static async checkProStatus() {
    return Promise.resolve(false);
  }

  static async presentPaywall() {
    return Promise.resolve(false);
  }
}
