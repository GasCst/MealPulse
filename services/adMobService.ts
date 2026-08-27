import mobileAds from 'react-native-google-mobile-ads';

export class AdMobService {
  static async initialize() {
    try {
      await mobileAds().setRequestConfiguration({
        testDeviceIdentifiers: ['EMULATOR', 'F3FCA862873FD255B71A17B00F6983A9'],
      });
      await mobileAds().initialize();
      console.log('[AdMobService] Google Mobile Ads initialized.');
    } catch (e) {
      console.warn('[AdMobService] Init notice:', e);
    }
  }
}
