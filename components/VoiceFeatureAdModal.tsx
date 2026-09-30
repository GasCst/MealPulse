import { TouchableOpacity } from '@/components/ui/FeedbackPressable';
import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let AdEventType: any = null;
let TestIds: any = null;

if (Platform.OS !== 'web') {
  try {
    const mobileAdsModule = require('react-native-google-mobile-ads');
    RewardedAd = mobileAdsModule.RewardedAd;
    RewardedAdEventType = mobileAdsModule.RewardedAdEventType;
    AdEventType = mobileAdsModule.AdEventType;
    TestIds = mobileAdsModule.TestIds;
  } catch (e) {
    console.warn('[VoiceFeatureAdModal] react-native-google-mobile-ads not available:', e);
  }
}

export const ADMOB_VOICE_REWARDED_UNIT_ID = 'ca-app-pub-3077938552594114/1449566589';
const adUnitId = __DEV__ ? (TestIds?.REWARDED || ADMOB_VOICE_REWARDED_UNIT_ID) : ADMOB_VOICE_REWARDED_UNIT_ID;

interface VoiceFeatureAdModalProps {
  visible: boolean;
  featureTitle: string;
  featureDescription?: string;
  featureIcon?: keyof typeof Ionicons.glyphMap;
  onClose: () => void;
  onUnlocked: () => void;
  onGoPro?: () => void;
}

export const VoiceFeatureAdModal: React.FC<VoiceFeatureAdModalProps> = ({
  visible,
  featureTitle,
  featureDescription,
  featureIcon = 'volume-high',
  onClose,
  onUnlocked,
  onGoPro,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

  const rewardedRef = useRef<any>(null);
  const adLoadedRef = useRef(false);
  const rewardEarnedRef = useRef(false);
  const pendingShowOnLoadRef = useRef(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanListenersRef = useRef<(() => void) | null>(null);

  const loadNewAd = () => {
    if (Platform.OS === 'web' || !RewardedAd) return;

    try {
      if (cleanListenersRef.current) {
        cleanListenersRef.current();
        cleanListenersRef.current = null;
      }

      adLoadedRef.current = false;
      setAdLoaded(false);
      rewardEarnedRef.current = false;

      const rewarded = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });
      rewardedRef.current = rewarded;

      const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[VoiceFeatureAdModal] Rewarded Ad loaded successfully');
        adLoadedRef.current = true;
        setAdLoaded(true);

        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }

        if (pendingShowOnLoadRef.current) {
          pendingShowOnLoadRef.current = false;
          try {
            rewarded.show();
          } catch (showErr) {
            console.warn('[VoiceFeatureAdModal] Show error on auto-open:', showErr);
            setIsLoadingAd(false);
          }
        }
      });

      const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        console.log('[VoiceFeatureAdModal] User earned reward for voice feature');
        rewardEarnedRef.current = true;
      });

      const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[VoiceFeatureAdModal] Ad closed. Reward earned:', rewardEarnedRef.current);
        setIsLoadingAd(false);
        pendingShowOnLoadRef.current = false;

        if (rewardEarnedRef.current) {
          onClose();
          onUnlocked();
        }

        setTimeout(() => {
          loadNewAd();
        }, 500);
      });

      const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, (err: any) => {
        console.warn('[VoiceFeatureAdModal] Ad error:', err);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }

        if (pendingShowOnLoadRef.current) {
          pendingShowOnLoadRef.current = false;
          setIsLoadingAd(false);
          // Graceful unlock if ad network fails
          Alert.alert(
            'Accesso Sbloccato',
            'La pubblicità non è disponibile al momento. Ti abbiamo sbloccato la riproduzione audio!',
            [
              {
                text: 'Ascolta Ora',
                onPress: () => {
                  onClose();
                  onUnlocked();
                },
              },
            ]
          );
        }
      });

      rewarded.load();

      cleanListenersRef.current = () => {
        try {
          unsubLoaded();
          unsubEarned();
          unsubClosed();
          unsubError();
        } catch {}
      };
    } catch (e) {
      console.warn('[VoiceFeatureAdModal] Init error:', e);
      adLoadedRef.current = false;
      setAdLoaded(false);
    }
  };

  useEffect(() => {
    if (!visible || Platform.OS === 'web' || !RewardedAd) {
      return;
    }

    if (!adLoadedRef.current || !rewardedRef.current) {
      loadNewAd();
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [visible]);

  const handleWatchAd = () => {
    rewardEarnedRef.current = false;

    if (Platform.OS === 'web' || !RewardedAd) {
      setIsLoadingAd(true);
      setTimeout(() => {
        setIsLoadingAd(false);
        onClose();
        onUnlocked();
      }, 1000);
      return;
    }

    if (adLoadedRef.current && rewardedRef.current) {
      setIsLoadingAd(true);
      try {
        rewardedRef.current.show();
      } catch (e) {
        console.warn('[VoiceFeatureAdModal] Show error:', e);
        setIsLoadingAd(false);
        onClose();
        onUnlocked();
      }
    } else {
      setIsLoadingAd(true);
      pendingShowOnLoadRef.current = true;
      loadNewAd();

      loadTimeoutRef.current = setTimeout(() => {
        if (pendingShowOnLoadRef.current) {
          pendingShowOnLoadRef.current = false;
          setIsLoadingAd(false);
          Alert.alert(
            'Accesso Concesso',
            'Pubblicità momentaneamente non disponibile. Buon ascolto!',
            [
              {
                text: 'Ascolta Ora',
                onPress: () => {
                  onClose();
                  onUnlocked();
                },
              },
            ]
          );
        }
      }, 5000);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDarkMode ? '#131920' : '#FFFFFF',
              borderColor: isDarkMode ? '#222F3E' : '#E2E8F0',
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            sound="close" onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Icon Badge */}
          <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(200, 243, 29, 0.15)' : '#F4FCE3' }]}>
            <Ionicons name={featureIcon} size={36} color={colors.lime} />
          </View>

          {/* Title & Pro Badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.proBadge, { backgroundColor: colors.lime }]}>
              <Text style={styles.proBadgeText}>FUNZIONALITÀ PRO</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {featureTitle}
          </Text>

          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            {featureDescription ||
              "Questa funzionalità audio vocale AI avanzata è inclusa con MealPulse PRO. Come utente Free puoi ascoltarla guardando un breve video pubblicitario."}
          </Text>

          {/* Action 1: Watch Ad to Unlock */}
          <TouchableOpacity
            style={[styles.watchAdBtn, { backgroundColor: colors.lime }]}
            sound="primary" onPress={handleWatchAd}
            disabled={isLoadingAd}
            activeOpacity={0.85}
          >
            {isLoadingAd ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <Ionicons name="play-circle" size={22} color="#0F172A" />
                <Text style={styles.watchAdText}>
                  {adLoaded ? 'Guarda Pubblicità e Ascolta' : 'Carica Video & Ascolta'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Action 2: Go PRO */}
          {onGoPro && (
            <TouchableOpacity
              style={[
                styles.goProBtn,
                {
                  backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
                  borderColor: isDarkMode ? '#334155' : '#CBD5E1',
                },
              ]}
              sound="open" onPress={() => {
                onClose();
                onGoPro();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={18} color={colors.lime} />
              <Text style={[styles.goProText, { color: colors.textPrimary }]}>
                Passa a MealPulse PRO (Senza Pubblicità)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  badgeRow: {
    marginBottom: 8,
  },
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
  },
  watchAdBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  watchAdText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  goProBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  goProText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
