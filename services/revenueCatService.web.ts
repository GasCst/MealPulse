// Web fallback for RevenueCatService
export class RevenueCatService {
  static async configure() {
    return Promise.resolve();
  }

  static async getOfferings() {
    return Promise.resolve(null);
  }

  static async purchasePlan() {
    return Promise.resolve(false);
  }

  static async restorePurchases() {
    return Promise.resolve(false);
  }

  static async isProUser() {
    return Promise.resolve(false);
  }
}
