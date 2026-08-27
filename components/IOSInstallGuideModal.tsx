import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export const IOSInstallGuideModal: React.FC = () => {
  const { colors, isDarkMode } = useTheme();
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

      // Show guide only for iOS users running inside Safari browser (not standalone yet)
      if (isIOS && !isStandalone) {
        // Check if user previously dismissed recently
        const dismissed = sessionStorage.getItem('mealpulse_ios_guide_dismissed');
        if (!dismissed) {
          const timer = setTimeout(() => setVisible(true), 1500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, []);

  if (!visible || Platform.OS !== 'web') return null;

  const handleDismiss = () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('mealpulse_ios_guide_dismissed', 'true');
    }
    setVisible(false);
  };

  const handleDownloadProfile = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/mealpulse.mobileconfig';
    }
  };

  const isIt = language === 'it';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.overlayDismiss} activeOpacity={1} onPress={handleDismiss} />
        
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
          {/* Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.appIconBadge}>
              <Text style={{ fontSize: 28 }}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {isIt ? 'Installa MealPulse su iPhone' : 'Install MealPulse on iPhone'}
              </Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>
                {isIt
                  ? 'Aggiungi l\'app alla Home per aprirla a tutto schermo come un\'app nativa.'
                  : 'Add to Home Screen to run fullscreen with no browser bars.'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 2 Methods Carousel / Cards */}
          <View style={styles.stepsContainer}>
            {/* Method 1: Safari Add to Home */}
            <View style={[styles.stepItem, { backgroundColor: isDarkMode ? '#1A2B22' : '#F8FAFC', borderColor: isDarkMode ? '#284335' : '#E2E8F0' }]}>
              <View style={styles.stepNumBadge}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  {isIt ? 'Tocca Condividi in basso su Safari' : 'Tap Safari Share icon'}
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  {isIt ? 'Premi l\'icona quadrata con la freccia verso l\'alto 📤' : 'Press the square icon with the up arrow 📤'}
                </Text>
              </View>
            </View>

            <View style={[styles.stepItem, { backgroundColor: isDarkMode ? '#1A2B22' : '#F8FAFC', borderColor: isDarkMode ? '#284335' : '#E2E8F0' }]}>
              <View style={styles.stepNumBadge}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  {isIt ? 'Seleziona "Aggiungi a Home"' : 'Select "Add to Home Screen"'}
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  {isIt ? 'Troverai l\'icona ufficiale di MealPulse tra le tue app.' : 'Official MealPulse icon will appear on your Home Screen.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick 1-Click Profile Option */}
          <TouchableOpacity
            style={[styles.profileBtn, { backgroundColor: isDarkMode ? '#20352A' : '#EEF2F6', borderColor: colors.coral }]}
            onPress={handleDownloadProfile}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={18} color={colors.coral} />
            <Text style={[styles.profileBtnText, { color: colors.textPrimary }]}>
              {isIt ? 'Oppure scarica profilo iOS (.mobileconfig)' : 'Or download iOS Profile (.mobileconfig)'}
            </Text>
          </TouchableOpacity>

          {/* Continue button */}
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.coral }]}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>
              {isIt ? 'Continua nel Browser' : 'Continue in Browser'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  overlayDismiss: {
    flex: 1,
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  appIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#BEF264',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  sub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  stepNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  profileBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  doneBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
