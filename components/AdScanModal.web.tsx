import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

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
  const { language } = useLanguage();
  const { colors, isDarkMode } = useTheme();

  const [countdown, setCountdown] = useState(5);
  const [canClaim, setCanClaim] = useState(false);

  const isIt = language === 'it';

  useEffect(() => {
    let timer: any;
    if (visible) {
      setCountdown(5);
      setCanClaim(false);

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanClaim(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible]);

  if (!visible) return null;

  const handleClaimReward = () => {
    onAdCompleted();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SPONSORED AD REWARD</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Ad Creative Showcase */}
          <View style={[styles.creativeBox, { backgroundColor: isDarkMode ? '#1A2B22' : '#F8FAFC', borderColor: colors.lime }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.lime }]}>
              <Ionicons name="sparkles" size={32} color="#0B1410" />
            </View>

            <Text style={[styles.adBrandTitle, { color: colors.textPrimary }]}>
              MealPulse AI Vision Engine
            </Text>
            <Text style={[styles.adBrandDesc, { color: colors.textSecondary }]}>
              {isIt
                ? 'Elaborazione nutrizionale basata su GPT-4o e Gemini Flash.'
                : 'Advanced multimodal food recognition powered by Gemini & GPT-4o.'}
            </Text>

            {/* Countdown / Status Indicator */}
            <View style={styles.timerRow}>
              {!canClaim ? (
                <>
                  <ActivityIndicator size="small" color={colors.lime} />
                  <Text style={[styles.timerText, { color: colors.lime }]}>
                    {isIt ? `Ricompensa pronta tra ${countdown}s...` : `Reward unlocking in ${countdown}s...`}
                  </Text>
                </>
              ) : (
                <View style={styles.readyRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  <Text style={styles.readyText}>
                    {isIt ? 'Scansione gratuita sbloccata!' : 'Free Scan Unlocked!'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionBlock}>
            {canClaim ? (
              <TouchableOpacity
                style={[styles.claimBtn, { backgroundColor: colors.lime }]}
                onPress={handleClaimReward}
                activeOpacity={0.85}
              >
                <Text style={styles.claimBtnText}>
                  {isIt ? 'Continua con la Scansione Pasto' : 'Continue with Meal Scan'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#0B1410" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.claimBtn, { backgroundColor: '#334155', opacity: 0.7 }]}
                disabled
              >
                <Text style={[styles.claimBtnText, { color: '#94A3B8' }]}>
                  {isIt ? `Attendi ${countdown}s...` : `Please wait ${countdown}s...`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Pro upsell */}
            <TouchableOpacity
              style={styles.proLink}
              onPress={() => {
                onClose();
                openPaywall('sponsored_web_ad');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="flash" size={14} color={colors.coral} />
              <Text style={[styles.proLinkText, { color: colors.coral }]}>
                {isIt ? 'Rimuovi attese con MealPulse PRO' : 'Skip all waiting with MealPulse PRO'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: 'rgba(190, 242, 100, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#BEF264',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creativeBox: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  adBrandTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  adBrandDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readyText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '800',
  },
  actionBlock: {
    gap: 10,
  },
  claimBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  claimBtnText: {
    color: '#0B1410',
    fontSize: 14,
    fontWeight: '800',
  },
  proLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  proLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
