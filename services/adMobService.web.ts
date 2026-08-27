// Web fallback for AdMobService
export class AdMobService {
  static async initialize() {
    // No-op on web
    return Promise.resolve();
  }
}
