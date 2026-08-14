import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || (Constants as any).appOwnership === 'expo';

// AdMob Banner Unit ID
export const ADMOB_BANNER_UNIT_ID = 'ca-app-pub-3077938552594114/4150327091';

const bannerAdUnitId = __DEV__ || isExpoGo ? TestIds.BANNER : ADMOB_BANNER_UNIT_ID;

interface AdBannerProps {
  location?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ location = 'general' }) => {
  const { isPro, openPaywall } = useSubscription();
  const [adFailed, setAdFailed] = useState(false);

  // Hide ads completely for PRO subscribers!
  if (isPro) {
    return null;
  }

  return (
    <View style={styles.adWrapper}>
      {!isExpoGo && !adFailed ? (
        <View style={styles.bannerContainer}>
          <BannerAd
            unitId={bannerAdUnitId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
            onAdLoaded={() => {
              setAdFailed(false);
            }}
            onAdFailedToLoad={(error) => {
              console.warn('[Google AdMob Banner Error]', error);
              setAdFailed(true);
            }}
          />
        </View>
      ) : (
        <View style={styles.adContainer}>
          <View style={styles.adHeader}>
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>ADVERTISEMENT</Text>
            </View>
            <TouchableOpacity
              style={styles.removeAdsBtn}
              onPress={() => openPaywall('ad_banner')}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={14} color="#84CC16" />
              <Text style={styles.removeAdsText}>Remove Ads with PRO</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.adBody}>
            <View style={styles.adIconBox}>
              <Ionicons name="sparkles" size={18} color="#84CC16" />
            </View>
            <View style={styles.adTextBox}>
              <Text style={styles.adTitle}>Upgrade to MealPulse PRO</Text>
              <Text style={styles.adSub}>Get Unlimited AI Scans & 100% Ad-Free Experience!</Text>
            </View>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => openPaywall('ad_banner_cta')}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaBtnText}>Go Ad-Free</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  bannerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    backgroundColor: 'transparent',
  },
  adContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  adBadge: {
    backgroundColor: '#F1F5F9',
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
    color: '#84CC16',
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
    backgroundColor: '#F7FEE7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BEF264',
  },
  adTextBox: {
    flex: 1,
  },
  adTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  adSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  ctaBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ctaBtnText: {
    color: '#BEF264',
    fontSize: 11,
    fontWeight: '800',
  },
});

