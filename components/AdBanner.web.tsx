import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTheme } from '@/context/ThemeContext';

interface AdBannerProps {
  location?: string;
}

export const AdBanner: React.FC<AdBannerProps> = () => {
  const { isPro, openPaywall } = useSubscription();
  const { isDarkMode, colors } = useTheme();

  if (isPro) return null;

  return (
    <View style={styles.adWrapper}>
      <View style={[styles.adContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={[styles.adHeader, { borderBottomColor: colors.cardBorder }]}>
          <View style={[styles.adBadge, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
            <Text style={styles.adBadgeText}>PRO POWER</Text>
          </View>
          <TouchableOpacity
            style={styles.removeAdsBtn}
            onPress={() => openPaywall('ad_banner')}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={14} color={colors.lime} />
            <Text style={[styles.removeAdsText, { color: colors.lime }]}>Unlock PRO</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.adBody}>
          <View style={[styles.adIconBox, { backgroundColor: isDarkMode ? '#1F331A' : '#F7FEE7', borderColor: colors.lime }]}>
            <Ionicons name="flash" size={18} color={colors.lime} />
          </View>
          <View style={styles.adTextBox}>
            <Text style={[styles.adTitle, { color: colors.textPrimary }]}>MealPulse AI Pro Access</Text>
            <Text style={[styles.adSub, { color: colors.textSecondary }]}>Unlimited photo AI scans, fasting coach and cloud sync.</Text>
          </View>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.lime }]}
            onPress={() => openPaywall('ad_banner_cta')}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaBtnText, { color: '#0B1410' }]}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  adWrapper: {
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  adContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  adBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  removeAdsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeAdsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  adBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  adTextBox: {
    flex: 1,
  },
  adTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  adSub: {
    fontSize: 11,
    marginTop: 2,
  },
  ctaBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ctaBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
