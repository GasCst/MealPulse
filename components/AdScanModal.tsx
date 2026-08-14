import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

export const ADMOB_APP_ID = 'ca-app-pub-3077938552594114~7408470274';
export const ADMOB_REWARDED_UNIT_ID = 'ca-app-pub-3077938552594114/1449566589';

// Use production unit ID, or fall back to TestIds.REWARDED if unverified
const adUnitId = __DEV__ ? TestIds.REWARDED : ADMOB_REWARDED_UNIT_ID;

interface AdScanModalProps {
  visible: boolean;
  onAdCompleted: () => void;
  onClose: () => void;
}

export const AdScanModal: React.FC<AdScanModalProps> = ({
  visible,
  onAdCompleted,
  onClose,
}) => {
  const { openPaywall } = useSubscription();
  const { t } = useLanguage();

  const [loaded, setLoaded] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [hasShownAdThisSession, setHasShownAdThisSession] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [adFailed, setAdFailed] = useState(false);

  const rewardedRef = useRef<RewardedAd | null>(null);
  const fallbackActiveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presentationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX: mirror state in refs so timers and closures read live values
  const loadedRef = useRef(false);
  const rewardEarnedRef = useRef(false);
  const adFailedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const hasShownAdRef = useRef(false);
  const isWatchingAdRef = useRef(false);

  const safeOnAdCompleted = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    if (fallbackActiveRef.current) {
      clearInterval(fallbackActiveRef.current);
      fallbackActiveRef.current = null;
    }
    setIsWatchingAd(false);
    isWatchingAdRef.current = false;
    onAdCompleted();
  };

  const loadAd = (targetUnitId: string) => {
    try {
      console.log(`[Google AdMob] Preloading Rewarded Ad (Unit ID: ${targetUnitId})...`);
      const rewarded = RewardedAd.createForAdRequest(targetUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });
      rewardedRef.current = rewarded;

      const unsubscribeLoaded = rewarded.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          console.log('[Google AdMob] Rewarded Ad Loaded & Ready to play!');
          loadedRef.current = true;
          setLoaded(true);
        }
      );

      const unsubscribeOpened = rewarded.addAdEventListener(
        AdEventType.OPENED,
        () => {
          console.log('[Google AdMob] Ad Opened Successfully');
          if (presentationTimeoutRef.current) {
            clearTimeout(presentationTimeoutRef.current);
            presentationTimeoutRef.current = null;
          }
        }
      );

      const unsubscribeEarned = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log('[Google AdMob] Reward Earned by User!', reward);
          rewardEarnedRef.current = true;
          safeOnAdCompleted();
        }
      );

      const unsubscribeClosed = rewarded.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('[Google AdMob] Ad Closed');
          if (!rewardEarnedRef.current) {
            safeOnAdCompleted();
          }
        }
      );

      const unsubscribeError = rewarded.addAdEventListener(
        AdEventType.ERROR,
        (error) => {
          console.error('[AdMob Bridge Error] Silent failure caught:', error);
          adFailedRef.current = true;
          setErrorMsg(error?.message || 'Ad load failed');
          setAdFailed(true);
        }
      );

      rewarded.load();

      return () => {
        unsubscribeLoaded();
        unsubscribeOpened();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
      };
    } catch (e: any) {
      console.warn('[Google AdMob Init Error]', e.message || e);
      adFailedRef.current = true;
      setAdFailed(true);
    }
  };

  useEffect(() => {
    if (!visible) return;

    setErrorMsg(null);
    setLoaded(false);
    setIsWatchingAd(false);
    setHasShownAdThisSession(false);
    setAdFailed(false);
    loadedRef.current = false;
    adFailedRef.current = false;
    rewardEarnedRef.current = false;
    hasCompletedRef.current = false;
    hasShownAdRef.current = false;
    isWatchingAdRef.current = false;

    const cleanup = loadAd(adUnitId);

    const autoPlayTimer = setTimeout(() => {
      handleWatchAd();
    }, 1200);

    return () => {
      clearTimeout(autoPlayTimer);
      if (presentationTimeoutRef.current) clearTimeout(presentationTimeoutRef.current);
      if (fallbackActiveRef.current) {
        clearInterval(fallbackActiveRef.current);
        fallbackActiveRef.current = null;
      }
      if (cleanup) cleanup();
      rewardedRef.current = null;
    };
  }, [visible]);

  const handleWatchAd = async () => {
    if (hasShownAdRef.current || isWatchingAdRef.current) {
      return;
    }
    hasShownAdRef.current = true;
    isWatchingAdRef.current = true;
    setHasShownAdThisSession(true);

    if (adFailedRef.current) {
      console.log('[Google AdMob] Ad already failed. Skipping instantly.');
      skipInstantly();
      return;
    }

    setIsWatchingAd(true);
    const currentAd = rewardedRef.current;

    if (currentAd && loadedRef.current) {
      triggerAdShow(currentAd);
    } else {
      console.log('[Google AdMob] Ad not loaded yet. Waiting gracefully (max 8s)...');
      let sec = 8;
      const interval = setInterval(() => {
        sec -= 1;

        if (rewardedRef.current && loadedRef.current) {
          clearInterval(interval);
          fallbackActiveRef.current = null;
          console.log('[Google AdMob] Ad finished loading while waiting! Showing now.');
          triggerAdShow(rewardedRef.current);
          return;
        }
        if (sec <= 0 || adFailedRef.current) {
          console.log('[Google AdMob] Max wait time reached or ad failed. Skipping.');
          clearInterval(interval);
          fallbackActiveRef.current = null;
          skipInstantly();
        }
      }, 1000);

      fallbackActiveRef.current = interval;
    }
  };

  const triggerAdShow = async (currentAd: RewardedAd) => {
    // STRICT CHECK: Ensure the Activity is in the foreground and interactable
    if (AppState.currentState !== 'active') {
      console.warn(`[AdMob] Cannot show ad. AppState is: ${AppState.currentState}. Activity is not valid.`);
      skipInstantly();
      return;
    }
    try {
      console.log('[AdMob] Attempting to mount full screen content...');

      // Timeout if AdMob fails to actually present the ad over the screen within 3.5s
      presentationTimeoutRef.current = setTimeout(() => {
        console.log('[Google AdMob] Presentation timeout reached. Ad failed to open.');
        skipInstantly();
      }, 3500);

      await currentAd.show();
      console.log('[AdMob] Promise resolved (Ad presented successfully)');
    } catch (error: any) {
      // This specifically catches the RN translation of onAdFailedToShowFullScreenContent
      console.error('[AdMob Show Error] Failed to show full screen content:', error.message);
      console.error('[AdMob Show Error Details]:', error);
      if (presentationTimeoutRef.current) clearTimeout(presentationTimeoutRef.current);
      skipInstantly();
    }
  };

  const skipInstantly = () => {
    safeOnAdCompleted();
  };

  const handleUpgradePro = () => {
    onClose();
    openPaywall('ad_scan_popup');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.sponsoredBadge}>
              <Ionicons name="play-circle" size={14} color="#84CC16" />
              <Text style={styles.sponsoredBadgeText}>SPONSORED AI SCAN</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Hero Section */}
          <View style={styles.heroBox}>
            <View style={styles.iconCircle}>
              <Ionicons name="tv-outline" size={32} color="#84CC16" />
            </View>
            <Text style={styles.title}>Unlock AI Photo Scan</Text>
            <Text style={styles.subtitle}>
              Watch a short Google sponsor video ad to cover your AI Vision model processing fees & calculate portion macros.
            </Text>
          </View>

          {/* Ad Status / Player Box */}
          {isWatchingAd ? (
            <View style={styles.watchingAdBox}>
              <ActivityIndicator size="small" color="#84CC16" />
              <Text style={styles.watchingAdText}>
                Google Sponsor Video Playing...
              </Text>
            </View>
          ) : (
            <View style={styles.adOfferBox}>
              <View style={styles.offerRow}>
                <Ionicons name="checkmark-circle" size={16} color="#84CC16" />
                <Text style={styles.offerText}>1 Full Video Ad = 1 Real AI Vision Scan</Text>
              </View>
              <View style={styles.offerRow}>
                <Ionicons name="shield-checkmark" size={16} color="#84CC16" />
                <Text style={styles.offerText}>Supports Free Tier Server Costs</Text>
              </View>
              {/* errorMsg is now surfaced instead of being silently discarded */}
              {errorMsg ? (
                <View style={styles.offerRow}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={[styles.offerText, { color: '#DC2626' }]}>
                    {errorMsg}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsBox}>
            <TouchableOpacity
              style={[styles.watchAdBtn, (isWatchingAd || hasShownAdThisSession) && styles.disabledBtn]}
              onPress={handleWatchAd}
              disabled={isWatchingAd || hasShownAdThisSession}
              activeOpacity={0.85}
            >
              <Ionicons name="play" size={18} color="#0F172A" />
              <Text style={styles.watchAdBtnText}>
                {isWatchingAd
                  ? 'Playing Google Video Ad...'
                  : hasShownAdThisSession
                  ? 'Ad Completed! Processing...'
                  : 'Watch Short Video Ad & Scan 🎬'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.proBtn}
              onPress={handleUpgradePro}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={16} color="#84CC16" />
              <Text style={styles.proBtnText}>Skip Ads Forever with PRO 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FEE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BEF264',
  },
  sponsoredBadgeText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  heroBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  adOfferBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  watchingAdBox: {
    backgroundColor: '#F7FEE7',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BEF264',
  },
  watchingAdText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionsBox: {
    gap: 10,
  },
  watchAdBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  watchAdBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  proBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
