// The browser cannot display an AdMob rewarded video. Never simulate an unlock.
export async function watchSoundRewardAd(_signal: AbortSignal, _onStatus: (status: 'loading' | 'showing') => void): Promise<boolean> {
  return false;
}
