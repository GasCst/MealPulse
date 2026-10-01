import { Platform } from 'react-native';
import { earnSoundChangeReward } from './soundCustomizationAccess';

// Reuse the application's existing rewarded placement; never request an ad for previews.
const REWARDED_UNIT = 'ca-app-pub-3077938552594114/1449566589';

export async function watchSoundRewardAd(signal: AbortSignal, onStatus: (status: 'loading' | 'showing') => void): Promise<boolean> {
  if (Platform.OS === 'web' || signal.aborted) return false;
  try {
    const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = require('react-native-google-mobile-ads');
    const ad = RewardedAd.createForAdRequest(__DEV__ ? TestIds.REWARDED : REWARDED_UNIT, {
      requestNonPersonalizedAdsOnly: true,
    });
    return await earnSoundChangeReward(ad, {
      loaded: RewardedAdEventType.LOADED, earned: RewardedAdEventType.EARNED_REWARD,
      closed: AdEventType.CLOSED, error: AdEventType.ERROR,
    }, signal, onStatus);
  } catch { return false; }
}
