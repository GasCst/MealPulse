import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, MonetizationPlans } from '@/constants/theme';
import { useSubscription, PlanType } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { SpinWheelModal } from '@/components/SpinWheelModal';
import { BeautifulAlertModal, BeautifulAlertProps } from '@/components/BeautifulAlertModal';

interface PaywallModalProps {
  visible?: boolean;
  onClose?: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose }) => {
  const { isPro, hasSeenSpinWheel, setHasSeenSpinWheel, showPaywall, closePaywall, subscribe, restorePurchases, paywallSource } = useSubscription();
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('weekly');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(599); // 09:59 countdown
  const [showSpinWheelModal, setShowSpinWheelModal] = useState(false);

  const [alertConfig, setAlertConfig] = useState<BeautifulAlertProps>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    buttonText: 'Awesome!',
    onClose: () => {},
  });

  const isVisible = visible !== undefined ? visible : showPaywall;
  const handleClose = onClose || closePaywall;

  const handleDismissPaywall = () => {
    if (onClose) {
      // When an explicit onClose callback is provided (e.g. from OnboardingScreen),
      // forward the dismiss action directly so the caller can sequence the SpinWheelModal.
      onClose();
    } else if (!isPro && !hasSeenSpinWheel) {
      setHasSeenSpinWheel(true);
      closePaywall();
      setTimeout(() => {
        setShowSpinWheelModal(true);
      }, 250);
    } else {
      handleClose();
    }
  };

  useEffect(() => {
    if (!isVisible) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 599));
    }, 1000);
    return () => clearInterval(timer);
  }, [isVisible]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const success = await subscribe(selectedPlan);
      if (success) {
        setAlertConfig({
          visible: true,
          type: 'success',
          title: '🎉 Welcome to MealPulse PRO!',
          message: 'Your subscription is active. All AI camera meal scans, custom macro targets, and nutrition coach advice are unlocked!',
          buttonText: 'Start Scanning Meals',
          onClose: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            handleClose();
          },
        });
      } else {
        // User cancelled or payment failed -> DO NOT SHOW WELCOME MODAL
        console.log('[PaywallModal] Purchase cancelled or unverified. No Pro access granted.');
      }
    } catch {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Payment Error',
        message: 'Unable to verify payment transaction. Please try again.',
        buttonText: 'OK',
        onClose: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      const restored = await restorePurchases();
      if (restored) {
        setAlertConfig({
          visible: true,
          type: 'success',
          title: 'Subscription Restored! ⚡',
          message: 'Your previous MealPulse PRO subscription was successfully restored.',
          buttonText: 'Awesome!',
          onClose: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            handleClose();
          },
        });
      }
    } catch {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'No Subscription Found',
        message: 'No active PRO subscription was found for this account.',
        buttonText: 'OK',
        onClose: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleDismissPaywall}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Top Bar with Close */}
            <View style={styles.headerRow}>
              <View style={styles.proBadge}>
                <Ionicons name="sparkles" size={14} color="#0F172A" />
                <Text style={styles.proBadgeText}>{t('paywall_badge')}</Text>
              </View>
              <TouchableOpacity onPress={handleDismissPaywall} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

          {/* Urgency Offer Banner */}
          <View style={styles.urgencyBanner}>
            <Ionicons name="flame" size={18} color="#F97316" />
            <Text style={styles.urgencyText}>
              50% OFF discount expires in{' '}
              <Text style={styles.timerText}>{formatTimer(timeLeft)}</Text>
            </Text>
          </View>

          {/* Hero Header */}
          <View style={styles.heroSection}>
            <View style={styles.crownCircle}>
              <Ionicons name="nutrition" size={36} color="#84CC16" />
            </View>
            <Text style={styles.heroTitle}>{t('paywall_hero_title')}</Text>
            <Text style={styles.heroSubtitle}>{t('paywall_hero_sub')}</Text>
          </View>

          {/* Plan Selector Options */}
          <View style={styles.plansContainer}>
            {/* Weekly Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'weekly' && styles.selectedPlanCard,
              ]}
              onPress={() => setSelectedPlan('weekly')}
              activeOpacity={0.8}
            >
              {selectedPlan === 'weekly' && (
                <View style={styles.trialBadge}>
                  <Text style={styles.trialBadgeText}>{t('most_popular')}</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={styles.planTitleGroup}>
                  <Text style={styles.planName}>{t('weekly_plan')}</Text>
                  <Text style={styles.planDesc}>{MonetizationPlans.weekly.description}</Text>
                </View>
                <View style={styles.planPriceGroup}>
                  <Text style={styles.planPrice}>{MonetizationPlans.weekly.price}</Text>
                  <Text style={styles.planPeriod}>{MonetizationPlans.weekly.period}</Text>
                </View>
              </View>
              <View style={styles.trialPill}>
                <Ionicons name="checkmark-circle" size={14} color="#84CC16" />
                <Text style={styles.trialPillText}>{t('cancel_anytime')}</Text>
              </View>
            </TouchableOpacity>

            {/* Monthly Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.selectedPlanCard,
              ]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.8}
            >
              <View style={styles.discountTag}>
                <Text style={styles.discountTagText}>SAVE 30%</Text>
              </View>
              <View style={styles.planHeader}>
                <View style={styles.planTitleGroup}>
                  <Text style={styles.planName}>{t('monthly_plan')}</Text>
                  <Text style={styles.planDesc}>{MonetizationPlans.monthly.description}</Text>
                </View>
                <View style={styles.planPriceGroup}>
                  <Text style={styles.planPrice}>{MonetizationPlans.monthly.price}</Text>
                  <Text style={styles.planPeriod}>{MonetizationPlans.monthly.period}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Yearly Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'yearly' && styles.selectedPlanCard,
              ]}
              onPress={() => setSelectedPlan('yearly')}
              activeOpacity={0.8}
            >
              <View style={[styles.discountTag, { backgroundColor: '#10B981' }]}>
                <Text style={styles.discountTagText}>{t('save_70')}</Text>
              </View>
              <View style={styles.planHeader}>
                <View style={styles.planTitleGroup}>
                  <Text style={styles.planName}>{t('yearly_plan')}</Text>
                  <Text style={styles.planDesc}>{MonetizationPlans.yearly.description}</Text>
                </View>
                <View style={styles.planPriceGroup}>
                  <Text style={styles.planPrice}>{MonetizationPlans.yearly.price}</Text>
                  <Text style={styles.planPeriod}>{MonetizationPlans.yearly.period}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Premium Features List */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>{t('features_overview')}</Text>
            {[
              { icon: 'camera', title: t('feature_1_title'), sub: t('feature_1_sub') },
              { icon: 'close-circle', title: t('feature_2_title'), sub: t('feature_2_sub') },
              { icon: 'barcode', title: t('feature_3_title'), sub: t('feature_3_sub') },
            ].map((item, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIconBox}>
                  <Ionicons name={item.icon as any} size={18} color="#84CC16" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureText}>{item.title}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{item.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Guarantee Box */}
          <View style={styles.testimonialCard}>
            <Text style={[styles.testimonialAuthor, { fontSize: 13, color: '#0F172A', fontWeight: '800' }]}>
              {t('guarantee_title')}
            </Text>
            <Text style={[styles.testimonialText, { fontSize: 12, marginTop: 4 }]}>
              {t('guarantee_sub')}
            </Text>
          </View>

          {/* Action CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSubscribe}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <View style={styles.ctaContent}>
                <Text style={styles.ctaText}>
                  {selectedPlan === 'weekly' ? t('start_trial') : t('subscribe_now')}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#0F172A" style={{ marginLeft: 8 }} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.guaranteeText}>
            🔒 {t('cancel_anytime')}
          </Text>

          {/* Footer Links */}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.footerLink}>{t('restore_purchases')}</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>•</Text>
            <TouchableOpacity onPress={() => Alert.alert('Terms of Service', 'Standard Apple EULA & MealPulse Terms.')}>
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>•</Text>
            <TouchableOpacity onPress={() => Alert.alert('Privacy Policy', 'Your meal photos & health data are 100% private.')}>
              <Text style={styles.footerLink}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>

    <SpinWheelModal
      visible={showSpinWheelModal}
      onClose={() => {
        setShowSpinWheelModal(false);
        handleClose();
      }}
    />

    <BeautifulAlertModal {...alertConfig} />
  </>
);
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BEF264',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  proBadgeText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  urgencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEDD5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  urgencyText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  timerText: {
    color: '#EA580C',
    fontWeight: '800',
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  crownCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F7FEE7',
    borderWidth: 2,
    borderColor: '#BEF264',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedPlanCard: {
    borderColor: '#84CC16',
    backgroundColor: '#F7FEE7',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitleGroup: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  planDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  planPriceGroup: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  planPeriod: {
    fontSize: 12,
    color: '#64748B',
  },
  discountTag: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#84CC16',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  discountTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  trialBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#BEF264',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trialBadgeText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
  },
  trialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
    backgroundColor: 'rgba(132, 204, 22, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trialPillText: {
    color: '#4D7C0F',
    fontSize: 12,
    fontWeight: '600',
  },
  featuresSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  featureIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F7FEE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  testimonialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#84CC16',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  testimonialText: {
    fontSize: 12.5,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  testimonialAuthor: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 6,
  },
  ctaButton: {
    backgroundColor: '#BEF264',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaText: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  guaranteeText: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  footerLink: {
    fontSize: 12,
    color: '#64748B',
  },
  footerDivider: {
    color: '#CBD5E1',
    fontSize: 12,
  },
});
