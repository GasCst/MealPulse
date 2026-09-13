import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { ComedyCharacter, ComedyCharacterId } from './AINutritionResultModal';

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
    console.warn('[RoastUnlockModal] react-native-google-mobile-ads not loaded:', e);
  }
}

export const ADMOB_REWARDED_UNIT_ID = 'ca-app-pub-3077938552594114/1449566589';
const adUnitId = __DEV__ ? (TestIds?.REWARDED || ADMOB_REWARDED_UNIT_ID) : ADMOB_REWARDED_UNIT_ID;

export interface UnlockableVoice {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  isProOnly?: boolean;
}

interface RoastUnlockModalProps {
  visible: boolean;
  character: UnlockableVoice | ComedyCharacter | null;
  onClose: () => void;
  onUnlocked: (characterId: any) => void;
  onGoPro: () => void;
}

export const RoastUnlockModal: React.FC<RoastUnlockModalProps> = ({
  visible,
  character,
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

  // Manteniamo sempre aggiornato il ref dell'ultimo personaggio da sbloccare
  const characterRef = useRef(character);
  characterRef.current = character;
  useEffect(() => {
    characterRef.current = character;
  }, [character]);

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
        console.log('[RoastUnlockModal] Rewarded Ad successfully loaded');
        adLoadedRef.current = true;
        setAdLoaded(true);

        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }

        // Se l'utente aveva già cliccato "Guarda la pubblicità" mentre era in caricamento, aprilo subito!
        if (pendingShowOnLoadRef.current) {
          pendingShowOnLoadRef.current = false;
          try {
            rewarded.show();
          } catch (showErr) {
            console.warn('[RoastUnlockModal] Show error on auto-open:', showErr);
            setIsLoadingAd(false);
          }
        }
      });

      const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        console.log('[RoastUnlockModal] User earned reward for character unlock');
        rewardEarnedRef.current = true;
      });

      const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[RoastUnlockModal] Ad closed. Reward earned:', rewardEarnedRef.current);
        setIsLoadingAd(false);
        pendingShowOnLoadRef.current = false;

        const currentTarget = characterRef.current || character;
        if (rewardEarnedRef.current && currentTarget) {
          onUnlocked(currentTarget.id);
        }

        // Precarica subito il prossimo annuncio per il prossimo cambio personaggio
        setTimeout(() => {
          loadNewAd();
        }, 500);
      });

      const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, (err: any) => {
        console.warn('[RoastUnlockModal] Ad error:', err);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }

        if (pendingShowOnLoadRef.current) {
          pendingShowOnLoadRef.current = false;
          setIsLoadingAd(false);
          Alert.alert(
            'Annuncio non disponibile',
            'Impossibile caricare il video pubblicitario al momento. Verifica la tua connessione e riprova.'
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
      console.warn('[RoastUnlockModal] Init error:', e);
      adLoadedRef.current = false;
      setAdLoaded(false);
    }
  };

  // Precarica Rewarded Ad quando il modale diventa visibile o viene montato
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
    if (!character) return;
    characterRef.current = character;
    rewardEarnedRef.current = false;

    if (Platform.OS === 'web' || !RewardedAd) {
      // Su Web simulazione per testing immediato
      setIsLoadingAd(true);
      setTimeout(() => {
        setIsLoadingAd(false);
        onUnlocked(character.id);
      }, 1000);
      return;
    }

    // Se l'annuncio è già caricato ed è pronto, mostralo immediatamente
    if (adLoadedRef.current && rewardedRef.current) {
      setIsLoadingAd(true);
      try {
        rewardedRef.current.show();
      } catch (err) {
        console.warn('[RoastUnlockModal] Error showing ad:', err);
        setIsLoadingAd(false);
        // Ritenta ricaricamento
        loadNewAd();
      }
      return;
    }

    // Se l'annuncio è ancora in caricamento o non pronto, mostriamo il loader e impostiamo il trigger
    setIsLoadingAd(true);
    pendingShowOnLoadRef.current = true;

    // Se non è stato ancora avviato il load, avvialo
    if (!rewardedRef.current) {
      loadNewAd();
    }

    // Timeout di sicurezza: se dopo 8 secondi non riceve risposta da AdMob, avvisa l'utente
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = setTimeout(() => {
      if (pendingShowOnLoadRef.current) {
        pendingShowOnLoadRef.current = false;
        setIsLoadingAd(false);
        Alert.alert(
          'Connessione lenta',
          'Il caricamento del video sta impiegando più del previsto. Tocca nuovamente per riprovare.'
        );
      }
    }, 8000);
  };

  if (!character) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#112217' : '#FFFFFF' }]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Character Avatar & Badge */}
          <View style={styles.characterHeader}>
            <View style={[styles.emojiCircle, { backgroundColor: isDarkMode ? '#1B3525' : '#F1F8F3' }]}>
              <Text style={styles.emojiText}>{character.emoji}</Text>
            </View>
            <View style={styles.proBadge}>
              <Ionicons name="sparkles" size={12} color="#FFA726" />
              <Text style={styles.proBadgeText}>PERSONAGGIO PRO</Text>
            </View>
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Sblocca {character.name}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {character.desc}. Ascolta il roast comico esclusivo generato apposta per questo piatto!
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Opzione 1: Passa a PRO */}
            <TouchableOpacity
              style={[styles.proButton, { backgroundColor: colors.coral }]}
              onPress={() => {
                onClose();
                onGoPro();
              }}
              activeOpacity={0.85}
            >
              <View style={styles.btnRow}>
                <Ionicons name="star" size={18} color="#FFFFFF" />
                <Text style={styles.proButtonText}>Passa a MealPulse PRO</Text>
              </View>
              <Text style={styles.proSubtext}>Sblocca tutti i personaggi & Zero Ads</Text>
            </TouchableOpacity>

            {/* Opzione 2: Guarda Video Rewarded */}
            <TouchableOpacity
              style={[
                styles.adButton,
                {
                  backgroundColor: isDarkMode ? '#1A2C22' : '#F4FAF5',
                  borderColor: isDarkMode ? '#2D4B39' : '#E0ECE3',
                },
              ]}
              onPress={handleWatchAd}
              disabled={isLoadingAd}
              activeOpacity={0.8}
            >
              {isLoadingAd ? (
                <ActivityIndicator size="small" color={colors.coral} />
              ) : (
                <>
                  <View style={styles.btnRow}>
                    <Ionicons name="play-circle" size={18} color="#FFA726" />
                    <Text style={[styles.adButtonText, { color: colors.textPrimary }]}>
                      Guarda video per sbloccare
                    </Text>
                  </View>
                  <Text style={[styles.adSubtext, { color: colors.textSecondary }]}>
                    Gratis per questo pasto (15-30s)
                  </Text>
                </>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  characterHeader: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emojiText: {
    fontSize: 38,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.35)',
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFA726',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 10,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  proButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  proSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  adButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  adButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  adSubtext: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
