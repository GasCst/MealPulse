import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Platform,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { GeminiMealRoastResponse, HealthGrade } from './geminiPrompt';

interface MealResultScreenProps {
  data: GeminiMealRoastResponse;
  imageUri?: string;
  initialWeightG?: number;
  onConfirm?: (finalMeal: {
    meal_name: string;
    calories: number;
    weight_g: number;
    proteins_g: number;
    carbs_g: number;
    fats_g: number;
    sugars_g: number;
    health_grade: HealthGrade;
    roast_speech: string;
  }) => void;
  onClose?: () => void;
}

/**
 * Risolve dinamicamente l'URL del server TTS Kokoro Docker in esecuzione sul Mac host.
 * Funziona nativamente con Expo Go su smartphone fisico connesso allo stesso Wi-Fi del Mac,
 * estraendo l'IP locale da Constants.expoConfig.hostUri.
 */
export const getLocalTtsApiUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  if (process.env.EXPO_PUBLIC_TTS_API_URL) {
    return process.env.EXPO_PUBLIC_TTS_API_URL.replace(/\/+$/, '');
  }

  // Estrae l'IP del computer host (es. 192.168.1.15) da Expo Go hostUri
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    return `http://${hostIp}:8000`;
  }

  // Fallback emulatore Android vs iOS simulator
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
};

export const MealResultScreen: React.FC<MealResultScreenProps> = ({
  data,
  imageUri,
  initialWeightG = 250,
  onConfirm,
  onClose,
}) => {
  // Stati per la porzione e ricalcolo proporzionale dei macronutrienti
  const [weightG, setWeightG] = useState<number>(initialWeightG);
  const baseWeightG = initialWeightG > 0 ? initialWeightG : 250;
  const ratio = weightG / baseWeightG;

  const currentCalories = Math.round(data.estimated_calories * ratio);
  const currentProteins = Math.round(data.macros.proteins_g * ratio * 10) / 10;
  const currentCarbs = Math.round(data.macros.carbs_g * ratio * 10) / 10;
  const currentFats = Math.round(data.macros.fats_g * ratio * 10) / 10;
  const currentSugars = Math.round(data.macros.sugars_g * ratio * 10) / 10;

  // Stati audio e TTS
  const [voice, setVoice] = useState<'im_nicola' | 'if_sara'>('im_nicola');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const waveAnim1 = useRef(new RNAnimated.Value(0.3)).current;
  const waveAnim2 = useRef(new RNAnimated.Value(0.5)).current;
  const waveAnim3 = useRef(new RNAnimated.Value(0.2)).current;

  // Feedback aptico leggero
  const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
  };

  // Configurazione audio e AUTOPLAY al montaggio della schermata
  useEffect(() => {
    let isMounted = true;

    const setupAndPlayTts = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        });

        if (isMounted) {
          await fetchAndPlayAudio(voice);
        }
      } catch (err: any) {
        console.warn('[MealResultScreen] Setup audio error:', err);
      }
    };

    setupAndPlayTts();

    return () => {
      isMounted = false;
      stopAndUnloadAudio();
    };
  }, []);

  // Animazione onde sonore durante la riproduzione
  useEffect(() => {
    let loop: RNAnimated.CompositeAnimation | null = null;
    if (isPlaying) {
      loop = RNAnimated.loop(
        RNAnimated.parallel([
          RNAnimated.sequence([
            RNAnimated.timing(waveAnim1, { toValue: 1.0, duration: 250, useNativeDriver: true }),
            RNAnimated.timing(waveAnim1, { toValue: 0.3, duration: 250, useNativeDriver: true }),
          ]),
          RNAnimated.sequence([
            RNAnimated.timing(waveAnim2, { toValue: 1.0, duration: 320, useNativeDriver: true }),
            RNAnimated.timing(waveAnim2, { toValue: 0.4, duration: 320, useNativeDriver: true }),
          ]),
          RNAnimated.sequence([
            RNAnimated.timing(waveAnim3, { toValue: 1.0, duration: 210, useNativeDriver: true }),
            RNAnimated.timing(waveAnim3, { toValue: 0.2, duration: 210, useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
    } else {
      waveAnim1.setValue(0.3);
      waveAnim2.setValue(0.5);
      waveAnim3.setValue(0.2);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isPlaying]);

  const stopAndUnloadAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {}
    setIsPlaying(false);
  };

  /**
   * Effettua la POST al servizio Docker Kokoro-82M e avvia lo streaming audio WAV
   */
  const fetchAndPlayAudio = async (selectedVoice: 'im_nicola' | 'if_sara') => {
    await stopAndUnloadAudio();
    setIsLoadingAudio(true);
    setAudioError(null);

    const baseUrl = getLocalTtsApiUrl();
    const endpoint = `${baseUrl}/api/v1/tts/roast`;

    try {
      console.log(`[TTS] Requesting audio from: ${endpoint} for voice ${selectedVoice}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/wav',
        },
        body: JSON.stringify({
          text: data.roast_speech,
          voice: selectedVoice,
          speed: 1.05,
        }),
      });

      if (!response.ok) {
        const errDetail = await response.text();
        throw new Error(`Server TTS errore (${response.status}): ${errDetail}`);
      }

      // Converti arrayBuffer in file temporaneo per riproduzione deterministica su expo-av
      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = arrayBufferToBase64(arrayBuffer);
      const tempWavPath = `${FileSystem.cacheDirectory}kokoro_roast_${Date.now()}.wav`;

      await FileSystem.writeAsStringAsync(tempWavPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: tempWavPath },
        { shouldPlay: true },
        (playbackStatus) => {
          if (playbackStatus.isLoaded) {
            setIsPlaying(playbackStatus.isPlaying);
            if (playbackStatus.didJustFinish) {
              setIsPlaying(false);
            }
          } else if (playbackStatus.error) {
            console.warn('[Audio Playback Error]:', playbackStatus.error);
            setIsPlaying(false);
          }
        }
      );

      soundRef.current = sound;
      setIsLoadingAudio(false);
      setIsPlaying(true);
      triggerHaptic('light');
    } catch (err: any) {
      console.error('[TTS Error]:', err);
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setAudioError(
        `Impossibile contattare il server TTS Kokoro (${baseUrl}). Verifica che il container Docker sia avviato.`
      );
    }
  };

  const handleTogglePlayPause = async () => {
    triggerHaptic('light');
    if (!soundRef.current) {
      await fetchAndPlayAudio(voice);
      return;
    }

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          if (status.positionMillis >= (status.durationMillis || 0)) {
            await soundRef.current.replayAsync();
          } else {
            await soundRef.current.playAsync();
          }
          setIsPlaying(true);
        }
      }
    } catch {
      await fetchAndPlayAudio(voice);
    }
  };

  const handleSwitchVoice = async (newVoice: 'im_nicola' | 'if_sara') => {
    if (newVoice === voice) return;
    triggerHaptic('medium');
    setVoice(newVoice);
    await fetchAndPlayAudio(newVoice);
  };

  const adjustGrams = (delta: number) => {
    triggerHaptic('light');
    setWeightG((prev) => Math.max(10, Math.min(1500, prev + delta)));
  };

  const handleConfirm = () => {
    triggerHaptic('success');
    if (onConfirm) {
      onConfirm({
        meal_name: data.meal_name,
        calories: currentCalories,
        weight_g: weightG,
        proteins_g: currentProteins,
        carbs_g: currentCarbs,
        fats_g: currentFats,
        sugars_g: currentSugars,
        health_grade: data.health_grade,
        roast_speech: data.roast_speech,
      });
    }
  };

  const gradeConfig = getGradeDetails(data.health_grade);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header con pulsante chiusura */}
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Analisi del Piatto</Text>
          {onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Card Foto e Badge Livello Nutrizionale */}
        <View style={styles.mediaCard}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.plateImage} />
          ) : (
            <View style={styles.platePlaceholder}>
              <Ionicons name="restaurant" size={48} color="#84CC16" />
            </View>
          )}

          <View style={[styles.gradeBadge, { backgroundColor: gradeConfig.badgeBg, borderColor: gradeConfig.color }]}>
            <Ionicons name={gradeConfig.icon as any} size={15} color={gradeConfig.color} />
            <Text style={[styles.gradeBadgeText, { color: gradeConfig.color }]}>{gradeConfig.label}</Text>
          </View>
        </View>

        {/* Titolo e Calorie Principali */}
        <View style={styles.titleSection}>
          <Text style={styles.mealNameText}>{data.meal_name}</Text>
          <View style={styles.calorieHeroRow}>
            <Text style={styles.calorieValText}>{currentCalories}</Text>
            <Text style={styles.calorieUnitText}>KCAL</Text>
          </View>
        </View>

        {/* ROAST VOCALE KOKORO-82M CARD */}
        <View style={styles.roastCard}>
          <View style={styles.roastHeaderRow}>
            <View style={styles.roastBadge}>
              <Ionicons name="flame" size={14} color="#FF6B4A" />
              <Text style={styles.roastBadgeTitle}>CHEF ROAST</Text>
            </View>

            {/* Selettore Voci Italiano: Nicola (M) o Sara (F) */}
            <View style={styles.voiceSelectorRow}>
              <TouchableOpacity
                style={[styles.voiceTab, voice === 'im_nicola' && styles.voiceTabActive]}
                onPress={() => handleSwitchVoice('im_nicola')}
                activeOpacity={0.8}
              >
                <Text style={[styles.voiceTabText, voice === 'im_nicola' && styles.voiceTabTextActive]}>
                  Nicola ♂
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voiceTab, voice === 'if_sara' && styles.voiceTabActive]}
                onPress={() => handleSwitchVoice('if_sara')}
                activeOpacity={0.8}
              >
                <Text style={[styles.voiceTabText, voice === 'if_sara' && styles.voiceTabTextActive]}>
                  Sara ♀
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Testo del Roast con virgolette stilizzate */}
          <Text style={styles.roastQuoteText}>"{data.roast_speech}"</Text>

          {/* Controller Audio & Onde Sonore */}
          <View style={styles.audioControlsRow}>
            <TouchableOpacity
              style={[styles.audioPlayBtn, isPlaying && styles.audioPlayBtnActive]}
              onPress={handleTogglePlayPause}
              disabled={isLoadingAudio}
              activeOpacity={0.85}
            >
              {isLoadingAudio ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#0F172A" />
              )}
            </TouchableOpacity>

            {/* Visualizer Onde Sonore */}
            <View style={styles.waveContainer}>
              <RNAnimated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim1 }] }]} />
              <RNAnimated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim2 }] }]} />
              <RNAnimated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim3 }] }]} />
              <RNAnimated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim2 }] }]} />
              <RNAnimated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim1 }] }]} />
              <Text style={styles.audioStatusLabel}>
                {isLoadingAudio ? 'Generazione Kokoro...' : isPlaying ? 'In riproduzione...' : 'Tocca per riascoltare'}
              </Text>
            </View>
          </View>

          {audioError && (
            <View style={styles.audioErrorBox}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.audioErrorText}>{audioError}</Text>
            </View>
          )}
        </View>

        {/* Input Porzione Grammi con Stepper */}
        <View style={styles.gramsSection}>
          <Text style={styles.sectionHeading}>Porzione Piatto</Text>
          <View style={styles.gramsStepperRow}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustGrams(-50)} activeOpacity={0.8}>
              <Text style={styles.stepBtnText}>-50g</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustGrams(-25)} activeOpacity={0.8}>
              <Text style={styles.stepBtnText}>-25g</Text>
            </TouchableOpacity>

            <View style={styles.gramsInputBox}>
              <TextInput
                style={styles.gramsInput}
                keyboardType="numeric"
                value={String(weightG)}
                onChangeText={(val) => {
                  const parsed = parseInt(val, 10);
                  if (!isNaN(parsed)) setWeightG(parsed);
                  else if (val === '') setWeightG(0);
                }}
              />
              <Text style={styles.gramsInputUnit}>g</Text>
            </View>

            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustGrams(25)} activeOpacity={0.8}>
              <Text style={styles.stepBtnText}>+25g</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustGrams(50)} activeOpacity={0.8}>
              <Text style={styles.stepBtnText}>+50g</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Griglia Macronutrienti (Proteine, Carbo, Grassi, Zuccheri) */}
        <View style={styles.macrosCard}>
          <Text style={styles.sectionHeading}>Macronutrienti Ricalcolati</Text>
          <View style={styles.macroGrid}>
            <View style={styles.macroItem}>
              <View style={[styles.macroIconCircle, { backgroundColor: 'rgba(255, 107, 74, 0.15)' }]}>
                <Ionicons name="barbell" size={16} color="#FF6B4A" />
              </View>
              <Text style={styles.macroVal}>{currentProteins}g</Text>
              <Text style={styles.macroLabel}>Proteine</Text>
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroIconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Ionicons name="pizza" size={16} color="#38BDF8" />
              </View>
              <Text style={styles.macroVal}>{currentCarbs}g</Text>
              <Text style={styles.macroLabel}>Carboidrati</Text>
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroIconCircle, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                <Ionicons name="water" size={16} color="#FBBF24" />
              </View>
              <Text style={styles.macroVal}>{currentFats}g</Text>
              <Text style={styles.macroLabel}>Grassi</Text>
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <Ionicons name="cube" size={16} color="#EC4899" />
              </View>
              <Text style={styles.macroVal}>{currentSugars}g</Text>
              <Text style={styles.macroLabel}>Zuccheri</Text>
            </View>
          </View>
        </View>

        {/* CTA Aggiungi al Diario */}
        <TouchableOpacity style={styles.confirmCtaBtn} onPress={handleConfirm} activeOpacity={0.88}>
          <Ionicons name="checkmark-circle" size={22} color="#0F172A" />
          <Text style={styles.confirmCtaText}>Aggiungi al Piano ({currentCalories} kcal)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

function getGradeDetails(grade: HealthGrade) {
  switch (grade) {
    case 'junk':
      return { label: 'JUNK FOOD ALERT', color: '#EF4444', badgeBg: 'rgba(239, 68, 68, 0.15)', icon: 'flame' };
    case 'poor':
      return { label: 'SBILANCIATO', color: '#F59E0B', badgeBg: 'rgba(245, 158, 11, 0.15)', icon: 'warning' };
    case 'balanced':
      return { label: 'EQUILIBRATO', color: '#38BDF8', badgeBg: 'rgba(56, 189, 248, 0.15)', icon: 'checkmark-circle' };
    case 'super_clean':
      return { label: 'SUPER CLEAN', color: '#84CC16', badgeBg: 'rgba(132, 204, 22, 0.15)', icon: 'leaf' };
    default:
      return { label: 'PASTO ANALIZZATO', color: '#94A3B8', badgeBg: 'rgba(148, 163, 184, 0.15)', icon: 'restaurant' };
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaCard: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#141A28',
    marginBottom: 18,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  plateImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  platePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    backdropFilter: 'blur(10px)',
  },
  gradeBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  titleSection: {
    marginBottom: 16,
  },
  mealNameText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  calorieHeroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  calorieValText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#84CC16',
  },
  calorieUnitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
  },
  roastCard: {
    backgroundColor: '#141A28',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  roastHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 74, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  roastBadgeTitle: {
    color: '#FF6B4A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  voiceSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#0F1420',
    borderRadius: 12,
    padding: 2,
  },
  voiceTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  voiceTabActive: {
    backgroundColor: '#84CC16',
  },
  voiceTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  voiceTabTextActive: {
    color: '#0F172A',
  },
  roastQuoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    color: '#F1F5F9',
    marginBottom: 16,
  },
  audioControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#84CC16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayBtnActive: {
    backgroundColor: '#A3E635',
  },
  waveContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waveBar: {
    width: 3.5,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#84CC16',
  },
  audioStatusLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 8,
    fontWeight: '600',
  },
  audioErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  audioErrorText: {
    fontSize: 11,
    color: '#EF4444',
    flex: 1,
  },
  gramsSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  gramsStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  gramsInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141A28',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  gramsInput: {
    fontSize: 20,
    fontWeight: '900',
    color: '#84CC16',
    textAlign: 'center',
    minWidth: 50,
  },
  gramsInputUnit: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
    marginLeft: 4,
  },
  macrosCard: {
    backgroundColor: '#141A28',
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  macroVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  macroLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  confirmCtaBtn: {
    backgroundColor: '#84CC16',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmCtaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
});
