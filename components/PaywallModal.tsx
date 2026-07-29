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

interface PaywallModalProps {
  visible?: boolean;
  onClose?: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose }) => {
  const { showPaywall, closePaywall, subscribe, restorePurchases, paywallSource } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('weekly');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(599); // 09:59 countdown

  const isVisible = visible !== undefined ? visible : showPaywall;
  const handleClose = onClose || closePaywall;

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
      await subscribe(selectedPlan);
      Alert.alert(
        '🎉 Welcome to MealPulse PRO!',
        'Your subscription is active. All AI camera meal scans, custom macro targets, and nutrition coach advice are unlocked!',
        [{ text: 'Start Scanning Meals', onPress: handleClose }]
      );
    } catch {
      Alert.alert('Error', 'Unable to process transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert('Restored!', 'Your previous PRO subscription was successfully restored.');
        handleClose();
      }
    } catch {
      Alert.alert('Error', 'No active subscription found to restore.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {/* Top Bar with Close */}
          <View style={styles.headerRow}>
            <View style={styles.proBadge}>
              <Ionicons name="sparkles" size={14} color="#0F172A" />
              <Text style={styles.proBadgeText}>LIMITED TIME OFFER</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
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
            <Text style={styles.heroTitle}>Unlock MealPulse PRO</Text>
            <Text style={styles.heroSubtitle}>
              {paywallSource === 'limit_reached'
                ? '⚡ You hit your free 3-scan daily limit! Upgrade now for unlimited AI camera photo meal scans & macro tracking.'
                : 'Instantly estimate calories & macros from plate photos, hit your body goals 3x faster, and get AI nutrition coaching.'}
            </Text>
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
                  <Text style={styles.trialBadgeText}>POPULAR TRIAL</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={styles.planTitleGroup}>
                  <Text style={styles.planName}>{MonetizationPlans.weekly.name}</Text>
                  <Text style={styles.planDesc}>{MonetizationPlans.weekly.description}</Text>
                </View>
                <View style={styles.planPriceGroup}>
                  <Text style={styles.planPrice}>{MonetizationPlans.weekly.price}</Text>
                  <Text style={styles.planPeriod}>{MonetizationPlans.weekly.period}</Text>
                </View>
              </View>
              <View style={styles.trialPill}>
                <Ionicons name="checkmark-circle" size={14} color="#84CC16" />
                <Text style={styles.trialPillText}>Includes 3-Day Free Trial (Cancel anytime)</Text>
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
                  <Text style={styles.planName}>{MonetizationPlans.monthly.name}</Text>
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
                <Text style={styles.discountTagText}>BEST VALUE (70% OFF)</Text>
              </View>
              <View style={styles.planHeader}>
                <View style={styles.planTitleGroup}>
                  <Text style={styles.planName}>{MonetizationPlans.yearly.name}</Text>
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
            <Text style={styles.featuresTitle}>What is included in MealPulse PRO:</Text>
            {[
              { icon: 'camera', text: 'Unlimited Camera AI Photo Meal Scans' },
              { icon: 'pie-chart', text: 'Instant Protein, Carbs, Fat & Calorie Breakdown' },
              { icon: 'fitness', text: 'Custom Weight Loss, Muscle Gain & Macro Targets' },
              { icon: 'analytics', text: 'AI Nutrition Coach Recommendations & Health Score' },
              { icon: 'water', text: 'Hydration & Daily Meal Log Synchronization' },
            ].map((item, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIconBox}>
                  <Ionicons name={item.icon as any} size={18} color="#84CC16" />
                </View>
                <Text style={styles.featureText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Social Proof */}
          <View style={styles.testimonialCard}>
            <View style={styles.starsRow}>
              {[...Array(5)].map((_, i) => (
                <Ionicons key={i} name="star" size={14} color="#F59E0B" />
              ))}
            </View>
            <Text style={styles.testimonialText}>
              &quot;MealPulse AI made tracking calories effortless. Just snap a photo of my plate and it calculates everything! Lost 12 lbs in 4 weeks!&quot;
            </Text>
            <Text style={styles.testimonialAuthor}>— Sarah M., Fitness Enthusiast</Text>
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
                  {selectedPlan === 'weekly' ? 'Start 3-Day Free Trial' : 'Unlock PRO Access Now'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#0F172A" style={{ marginLeft: 8 }} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.guaranteeText}>
            🔒 Secured by App Store / Google Play. Cancel anytime in 1 tap.
          </Text>

          {/* Footer Links */}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.footerLink}>Restore Purchases</Text>
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
