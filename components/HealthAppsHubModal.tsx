import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTheme } from '@/context/ThemeContext';
import { HealthSyncService } from '@/services/healthSyncService';

interface HealthAppsHubModalProps {
  visible: boolean;
  onClose: () => void;
}

interface HealthPlatform {
  id: string;
  name: string;
  brand: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  description: string;
  guideStep: string;
  onLaunch: () => Promise<boolean>;
  isUniversalHub?: boolean;
}

export const HealthAppsHubModal: React.FC<HealthAppsHubModalProps> = ({
  visible,
  onClose,
}) => {
  const { isDarkMode } = useTheme();
  const { triggerHealthSync, healthSyncStatus } = useSubscription();
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

  const colors = {
    bg: isDarkMode ? '#0B130E' : '#F7FAF4',
    cardBg: isDarkMode ? '#122017' : '#FFFFFF',
    cardBorder: isDarkMode ? '#1F382B' : '#E2E8F0',
    textPrimary: isDarkMode ? '#F1F5F9' : '#0F172A',
    textSecondary: isDarkMode ? '#94A3B8' : '#64748B',
    accentGreen: '#BEF264',
    accentCoral: '#FF6A45',
    inputBg: isDarkMode ? '#182C20' : '#F1F5F9',
  };

  const platforms: HealthPlatform[] = [
    {
      id: 'health_connect',
      name: 'Google Health Connect',
      brand: 'Android Universale (Google Pixel, Moto, Sony, ecc.)',
      iconName: 'heart-circle',
      iconColor: '#34A853',
      iconBg: isDarkMode ? '#163B23' : '#DCFCE7',
      description: 'Il centro nevralgico Android che collega tutti gli smartwatch e le app salute a MealPulse.',
      guideStep: 'Apri Health Connect ➔ Dati e accesso ➔ Consenti a MealPulse e alle tue app fitness di condividere passi e calorie.',
      isUniversalHub: true,
      onLaunch: async () => await HealthSyncService.openHealthConnect(),
    },
    {
      id: 'samsung_health',
      name: 'Samsung Health',
      brand: 'Samsung Galaxy & Galaxy Watch',
      iconName: 'fitness',
      iconColor: '#0381FE',
      iconBg: isDarkMode ? '#0F2A4A' : '#DBEAFE',
      description: 'Condivide passi, allenamenti e calorie attive dal tuo Galaxy Watch e telefono Samsung.',
      guideStep: 'Apri Samsung Health ➔ Impostazioni (3 puntini in alto) ➔ Health Connect ➔ Consenti condivisione passi e calorie.',
      onLaunch: async () => await HealthSyncService.openSamsungHealth(),
    },
    {
      id: 'xiaomi_fitness',
      name: 'Xiaomi Mi Fitness & Zepp',
      brand: 'Xiaomi, Redmi Smart Band, Amazfit',
      iconName: 'watch-outline',
      iconColor: '#FF6700',
      iconBg: isDarkMode ? '#3B1F0E' : '#FFEDD5',
      description: 'Sincronizza passi e attività da Mi Band, Xiaomi Watch e orologi Amazfit.',
      guideStep: 'Apri Mi Fitness (o Zepp) ➔ Profilo ➔ App connesse ➔ Health Connect ➔ Attiva sincronizzazione.',
      onLaunch: async () => await HealthSyncService.openXiaomiFitness(),
    },
    {
      id: 'huawei_health',
      name: 'Huawei Health',
      brand: 'Huawei Watch, Band & telefoni Huawei',
      iconName: 'pulse',
      iconColor: '#E60012',
      iconBg: isDarkMode ? '#3B1214' : '#FEE2E2',
      description: 'Condivide l’attività registrata con Huawei Watch GT e Huawei Band.',
      guideStep: 'Apri Huawei Health ➔ Personale ➔ Gestione privacy ➔ Condivisione dati ➔ Health Connect.',
      onLaunch: async () => await HealthSyncService.openHuaweiHealth(),
    },
    {
      id: 'google_fit',
      name: 'Google Fit',
      brand: 'Wear OS, Fossil, TicWatch, Pixel Watch',
      iconName: 'walk',
      iconColor: '#4285F4',
      iconBg: isDarkMode ? '#152542' : '#E0E7FF',
      description: 'Sincronizza minuti attivi, battiti e passi registrati tramite Google Fit.',
      guideStep: 'Apri Google Fit ➔ Profilo ➔ Impostazioni ➔ Sincronizza con Health Connect.',
      onLaunch: async () => await HealthSyncService.openGoogleFit(),
    },
    {
      id: 'garmin_connect',
      name: 'Garmin Connect',
      brand: 'Garmin Forerunner, Fenix, Venu',
      iconName: 'speedometer-outline',
      iconColor: '#007CC3',
      iconBg: isDarkMode ? '#0F2C3D' : '#E0F2FE',
      description: 'Invia allenamenti di corsa, ciclismo e palestra da dispositivi Garmin.',
      guideStep: 'Apri Garmin Connect ➔ Impostazioni ➔ App connesse ➔ Collega a Health Connect.',
      onLaunch: async () => await HealthSyncService.openGarminConnect(),
    },
    {
      id: 'fitbit',
      name: 'Fitbit',
      brand: 'Fitbit Charge, Sense, Versa',
      iconName: 'flame',
      iconColor: '#00B0B9',
      iconBg: isDarkMode ? '#0F3033' : '#CCFBF1',
      description: 'Sincronizza calorie bruciate e passi dal tuo account Fitbit.',
      guideStep: 'Apri l’app Fitbit ➔ Impostazioni ➔ Sincronizza con Health Connect.',
      onLaunch: async () => await HealthSyncService.openFitbit(),
    },
    {
      id: 'strava',
      name: 'Strava',
      brand: 'Corsa, Bici & GPS Workout',
      iconName: 'bicycle',
      iconColor: '#FC4C02',
      iconBg: isDarkMode ? '#3B1808' : '#FFEDD5',
      description: 'Importa le calorie bruciate durante le tue uscite su Strava.',
      guideStep: 'Apri Strava ➔ Impostazioni ➔ Applicazioni e dispositivi ➔ Health Connect.',
      onLaunch: async () => await HealthSyncService.openStrava(),
    },
    {
      id: 'apple_health',
      name: 'Apple Health',
      brand: 'iPhone & Apple Watch (iOS)',
      iconName: 'heart',
      iconColor: '#FF2D55',
      iconBg: isDarkMode ? '#3B0F19' : '#FFE4E6',
      description: 'L’hub salute di Apple per tutti i dati di iPhone e Apple Watch.',
      guideStep: 'Apri Impostazioni iPhone ➔ Salute ➔ Accesso dati e dispositivi ➔ MealPulse ➔ Attiva tutto.',
      onLaunch: async () => await HealthSyncService.openAppleHealth(),
    },
  ];

  const handleLaunchApp = async (platform: HealthPlatform) => {
    try {
      const launched = await platform.onLaunch();
      if (!launched) {
        Alert.alert(
          platform.name,
          `Non è stato possibile aprire direttamente l'app. Assicurati che sia installata sul tuo smartphone.`
        );
      }
    } catch {
      await Linking.openSettings();
    }
  };

  const handleSyncNow = async () => {
    await triggerHealthSync();
    Alert.alert('Sincronizzazione Completata ✅', 'I dati di passi e calorie sono stati aggiornati!');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Hub Salute & Smartwatch</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Hero Banner */}
          <View style={[styles.heroBanner, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="hardware-chip-outline" size={24} color="#0F172A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                Compatibilità Totale Multi-Dispositivo
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                Supporta tutti gli smartphone e smartwatch: Samsung, Apple, Xiaomi, Huawei, Google, Garmin, Fitbit, Strava e altri.
              </Text>
            </View>
          </View>

          {/* Quick Guide Card */}
          <View style={[styles.infoBox, { backgroundColor: isDarkMode ? '#16281D' : '#F0FDF4', borderColor: '#86EFAC' }]}>
            <Ionicons name="sparkles" size={18} color="#16A34A" style={{ marginTop: 2 }} />
            <Text style={[styles.infoBoxText, { color: isDarkMode ? '#DCFCE7' : '#14532D' }]}>
              <Text style={{ fontWeight: '700' }}>Come funziona: </Text>
              Tutte le app fitness comunicano con l’hub universale (Health Connect su Android, Apple Health su iOS). MealPulse legge automaticamente calorie e passi in tempo reale.
            </Text>
          </View>

          {/* List of Platforms */}
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            Seleziona la tua app / smartwatch:
          </Text>

          {platforms.map((p) => {
            const isGuideOpen = selectedGuideId === p.id;

            return (
              <View
                key={p.id}
                style={[
                  styles.platformCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: p.isUniversalHub ? '#86EFAC' : colors.cardBorder,
                    borderWidth: p.isUniversalHub ? 1.5 : 1,
                  },
                ]}
              >
                <View style={styles.platformHeader}>
                  <View style={[styles.platformIcon, { backgroundColor: p.iconBg }]}>
                    <Ionicons name={p.iconName} size={22} color={p.iconColor} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.platformName, { color: colors.textPrimary }]}>{p.name}</Text>
                      {p.isUniversalHub && (
                        <View style={styles.hubBadge}>
                          <Text style={styles.hubBadgeText}>HUB UNIVERSALE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.platformBrand, { color: colors.textSecondary }]}>{p.brand}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.openAppBtn, { backgroundColor: isDarkMode ? '#1E3A2B' : '#DCFCE7' }]}
                    onPress={() => handleLaunchApp(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.openAppBtnText}>Apri</Text>
                    <Ionicons name="open-outline" size={13} color="#16A34A" />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.platformDesc, { color: colors.textSecondary }]}>{p.description}</Text>

                {/* Collapsible Guide Toggle */}
                <TouchableOpacity
                  style={[styles.guideToggleRow, { borderTopColor: colors.cardBorder }]}
                  onPress={() => setSelectedGuideId(isGuideOpen ? null : p.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="help-circle-outline" size={15} color="#0EA5E9" />
                    <Text style={[styles.guideToggleText, { color: '#0EA5E9' }]}>
                      {isGuideOpen ? 'Nascondi istruzioni di collegamento' : 'Come collegare a MealPulse'}
                    </Text>
                  </View>
                  <Ionicons
                    name={isGuideOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#0EA5E9"
                  />
                </TouchableOpacity>

                {isGuideOpen && (
                  <View style={[styles.guideContentBox, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.guideStepText, { color: colors.textPrimary }]}>
                      👉 {p.guideStep}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.syncActionBtn, { backgroundColor: '#BEF264' }]}
            onPress={handleSyncNow}
            activeOpacity={0.8}
          >
            <Ionicons
              name={healthSyncStatus === 'syncing' ? 'sync' : 'refresh-circle'}
              size={22}
              color="#0F172A"
            />
            <Text style={styles.syncActionBtnText}>
              {healthSyncStatus === 'syncing' ? 'Sincronizzazione in corso...' : 'Sincronizza Dati Ora'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#BEF264',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  heroSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 18,
  },
  infoBoxText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  platformCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  platformIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformName: {
    fontSize: 15,
    fontWeight: '700',
  },
  platformBrand: {
    fontSize: 12,
    marginTop: 2,
  },
  hubBadge: {
    backgroundColor: '#BEF264',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hubBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F172A',
  },
  openAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  openAppBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  platformDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  guideToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  guideToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  guideContentBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
  },
  guideStepText: {
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  syncActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
