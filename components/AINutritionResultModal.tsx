import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { RoastUnlockModal, UnlockableVoice } from './RoastUnlockModal';
import { VoiceSelectorModal, ModelVoiceItem, DEFAULT_MODEL_VOICES } from './VoiceSelectorModal';
import { getDynamicTtsApiUrl } from '@/services/remoteConfigService';
import { generateCustomVoiceRoast } from '@/services/aiVisionService';

export interface CharacterRoasts {
  zio_italiano?: string;
  chef_sarcastico?: string;
  diva_ironica?: string;
  roastmaster?: string;
  if_sara?: string;
}

export interface ScannedNutritionData {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  estimated_weight_g?: number;
  item_count?: number;
  unit_weight_g?: number;
  insights?: string;
  health_score?: 'A' | 'B' | 'C' | 'D';
  image_uri?: string;
  roast_speech?: string;
  character_roasts?: CharacterRoasts;
}

export type ComedyCharacterId =
  | 'zio_italiano'
  | 'chef_sarcastico'
  | 'diva_ironica'
  | 'roastmaster'
  | 'if_sara';

export interface ComedyCharacter {
  id: ComedyCharacterId;
  name: string;
  emoji: string;
  desc: string;
  isProOnly?: boolean;
}

export const COMEDY_CHARACTERS: ComedyCharacter[] = [
  { id: 'zio_italiano', name: 'Zio Napoletano', emoji: '🤌', desc: 'Uè wagliò! Verace e passionale', isProOnly: false },
  { id: 'chef_sarcastico', name: 'Chef Gordon', emoji: '👨‍🍳', desc: 'Spietato e severo', isProOnly: true },
  { id: 'diva_ironica', name: 'Diva Snob', emoji: '💅', desc: 'Milanese snob e tagliente', isProOnly: true },
  { id: 'roastmaster', name: 'Stand-up Comico', emoji: '⚡', desc: 'Comico romano da cabaret', isProOnly: true },
  { id: 'if_sara', name: 'Sara Gen-Z', emoji: '🎙️', desc: 'Fitness bestie e meme', isProOnly: true },
];

const COMEDY_PROFILES: Record<string, any> = {
  zio_italiano: {
    id: 'zio_italiano',
    name: 'Zio Napoletano',
    personality: 'Passionale e verace in dialetto napoletano, difensore sacro della buona tavola',
    styleTag: 'Zio Napoletano',
    timbre: 'Caldo, teatrale e viscerale',
    cadence: 'Napoletana espressiva',
  },
  chef_sarcastico: {
    id: 'chef_sarcastico',
    name: 'Chef Gordon',
    personality: 'Tiranno Michelin spietato, furioso ed esigente',
    styleTag: 'Chef Furioso',
    timbre: 'Autoritario e tagliente',
    cadence: 'Incalzante e severa',
  },
  diva_ironica: {
    id: 'diva_ironica',
    name: 'Diva Snob',
    personality: 'Milanese fashion influencer snob, disgustata dai carboidrati della vergogna',
    styleTag: 'Diva Snob',
    timbre: 'Sofisticato, distaccato',
    cadence: 'Lenta e snob con battute ciniche',
  },
  roastmaster: {
    id: 'roastmaster',
    name: 'Stand-up Comico',
    personality: 'Comico romano da cabaret disincantato e cinico',
    styleTag: 'Stand-up Comedian',
    timbre: 'Romano sornione e graffiante',
    cadence: 'Ad orologeria con punchline immediata',
  },
  if_sara: {
    id: 'if_sara',
    name: 'Sara Gen-Z',
    personality: 'Fitness bestie meme lover senza filtri e meme logic',
    styleTag: 'Gen-Z Bestie',
    timbre: 'Giovanile, vivace ed energico',
    cadence: 'Veloce e diretta',
  },
};

interface AINutritionResultModalProps {
  visible: boolean;
  data: ScannedNutritionData | null;
  onClose: () => void;
  onConfirm: (finalData: ScannedNutritionData & { servingMultiplier: number }) => void;
}

/**
 * Risolve l'endpoint del microservizio TTS Kokoro-82M Docker.
 * - Su Web: 'http://localhost:8000' (stesso host del browser, zero blocchi CORS).
 * - Su Mobile (Expo Go / LAN): legge EXPO_PUBLIC_TTS_API_URL o estrae l'IP host (es. 192.168.1.76:8000).
 */
export const getLocalTtsApiUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  if (process.env.EXPO_PUBLIC_TTS_API_URL) {
    return process.env.EXPO_PUBLIC_TTS_API_URL.replace(/\/+$/, '');
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    return `http://${hostIp}:8000`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
};

export const AINutritionResultModal: React.FC<AINutritionResultModalProps> = ({
  visible,
  data,
  onClose,
  onConfirm,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isPro, openPaywall } = useSubscription();
  const [servingMultiplier, setServingMultiplier] = useState<number>(1.0);

  // Image error fallback
  const [imageLoadFailed, setImageLoadFailed] = useState<boolean>(false);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [data?.image_uri]);

  // Personaggi Comici & Voci TTS (5 Roast comici + 58 voci di base del modello)
  const [voice, setVoice] = useState<string>('zio_italiano');
  const [customSelectedVoice, setCustomSelectedVoice] = useState<ModelVoiceItem | null>(null);
  const [showVoiceSelectorModal, setShowVoiceSelectorModal] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Cache locale dei file audio scaricati per i singoli personaggi durante la sessione di scansione
  const audioCacheRef = useRef<Record<string, string>>({});
  const playbackReqIdRef = useRef<number>(0);

  // Sblocco Personaggi Roast (Freemium + Pro + Rewarded Ad)
  const [unlockedCharacters, setUnlockedCharacters] = useState<Record<string, boolean>>({});
  const [characterToUnlock, setCharacterToUnlock] = useState<ComedyCharacter | UnlockableVoice | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);

  // Cache dei testi generati con AI per le voci di base del modello
  const [customRoasts, setCustomRoasts] = useState<Record<string, string>>({});
  const customRoastsRef = useRef<Record<string, string>>({});

  const handleSelectCharacter = (char: ComedyCharacter) => {
    const isLocked = char.isProOnly && !isPro && !unlockedCharacters[char.id];
    if (isLocked) {
      try {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      setCharacterToUnlock(char);
      setShowUnlockModal(true);
      return;
    }

    // Se l'utente clicca sul personaggio già selezionato
    if (voice === char.id) {
      if (isPlaying) {
        handleTogglePlayPause();
      } else {
        // Riavvia da capo se era fermo o finito
        fetchAndPlayAudio(char.id);
      }
      return;
    }

    setVoice(char.id);
    fetchAndPlayAudio(char.id);
  };

  const handleSelectCustomVoice = (item: ModelVoiceItem) => {
    setShowVoiceSelectorModal(false);
    setCustomSelectedVoice(item);

    // Controllo Paywall/Spot: Se utente free e la voce non è ancora sbloccata
    const isLocked = !isPro && !unlockedCharacters[item.id];
    if (isLocked) {
      try {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      setCharacterToUnlock({
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        desc: `${item.styleTag} • ${item.personality}`,
        isProOnly: true,
      });
      setShowUnlockModal(true);
      return;
    }

    if (voice === item.id) {
      if (isPlaying) {
        handleTogglePlayPause();
      } else {
        fetchAndPlayAudio(item.id, false, item);
      }
      return;
    }

    setVoice(item.id);
    fetchAndPlayAudio(item.id, false, item);
  };

  const handleCharacterUnlocked = (charId: string) => {
    setShowUnlockModal(false);
    setUnlockedCharacters((prev) => ({ ...prev, [charId]: true }));
    setVoice(charId);

    const foundCustom = DEFAULT_MODEL_VOICES.find((v) => v.id === charId);
    if (foundCustom) {
      setCustomSelectedVoice(foundCustom);
    }
    fetchAndPlayAudio(charId, false, foundCustom || undefined);
  };

  const handleGoPro = () => {
    setShowUnlockModal(false);
    openPaywall('chef_roast');
  };

  const soundRef = useRef<Audio.Sound | null>(null);
  const webAudioRef = useRef<any>(null);

  const waveAnim1 = useRef(new RNAnimated.Value(0.3)).current;
  const waveAnim2 = useRef(new RNAnimated.Value(0.6)).current;
  const waveAnim3 = useRef(new RNAnimated.Value(0.4)).current;

  // Animazione barre di frequenza audio durante la riproduzione vocale
  useEffect(() => {
    let animLoop: RNAnimated.CompositeAnimation | null = null;
    if (isPlaying) {
      animLoop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.parallel([
            RNAnimated.timing(waveAnim1, { toValue: 1.0, duration: 250, useNativeDriver: true }),
            RNAnimated.timing(waveAnim2, { toValue: 0.3, duration: 280, useNativeDriver: true }),
            RNAnimated.timing(waveAnim3, { toValue: 0.9, duration: 220, useNativeDriver: true }),
          ]),
          RNAnimated.parallel([
            RNAnimated.timing(waveAnim1, { toValue: 0.3, duration: 250, useNativeDriver: true }),
            RNAnimated.timing(waveAnim2, { toValue: 0.9, duration: 280, useNativeDriver: true }),
            RNAnimated.timing(waveAnim3, { toValue: 0.4, duration: 220, useNativeDriver: true }),
          ]),
        ])
      );
      animLoop.start();
    } else {
      RNAnimated.parallel([
        RNAnimated.timing(waveAnim1, { toValue: 0.3, duration: 150, useNativeDriver: true }),
        RNAnimated.timing(waveAnim2, { toValue: 0.5, duration: 150, useNativeDriver: true }),
        RNAnimated.timing(waveAnim3, { toValue: 0.2, duration: 150, useNativeDriver: true }),
      ]).start();
    }
    return () => {
      animLoop?.stop();
    };
  }, [isPlaying]);

  const stopAndUnloadAudio = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (webAudioRef.current) {
        try {
          webAudioRef.current.pause();
          webAudioRef.current.currentTime = 0;
        } catch {}
        webAudioRef.current = null;
      }
    }

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setIsPlaying(false);
  };

  const cleanupAudioCache = async () => {
    if (Platform.OS !== 'web') {
      const files = Object.values(audioCacheRef.current);
      audioCacheRef.current = {};
      for (const uri of files) {
        if (uri) {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch {}
        }
      }
    } else {
      audioCacheRef.current = {};
    }
  };

  // Scarica e riproduce l'audio dal microservizio Docker XTTS-v2 (Web & Native) con cache locale istantanea
  const fetchAndPlayAudio = async (
    selectedVoice: string,
    forceRefreshUrl: boolean = false,
    voiceItem?: ModelVoiceItem
  ) => {
    const reqId = ++playbackReqIdRef.current;

    await stopAndUnloadAudio();
    setIsLoadingAudio(true);
    setAudioError(null);

    // 0. GENERAZIONE TESTO ROAST DEDICATO CON GEMINI FLASH PER VOCI DEL MODELLO O PERSONAGGI COMICI
    let textToSpeak = customRoastsRef.current[selectedVoice];
    if (!textToSpeak) {
      const isCustom = !COMEDY_CHARACTERS.some((c) => c.id === selectedVoice);
      if (isCustom) {
        const vObj = voiceItem || DEFAULT_MODEL_VOICES.find((v) => v.id === selectedVoice) || customSelectedVoice;
        if (vObj) {
          try {
            textToSpeak = await generateCustomVoiceRoast(
              data?.food_name || 'questo piatto',
              currentCalories,
              vObj,
              `Analisi completata... ${currentCalories} calorie per ${data?.food_name || 'il tuo piatto'}!`
            );
          } catch {
            textToSpeak = `Calcolo completato per ${data?.food_name || 'questo piatto'}... ${currentCalories} calorie rilevate!`;
          }
        }
      } else {
        // Personaggio comico (zio_italiano, chef_sarcastico, diva_ironica, roastmaster, if_sara)
        const charRoast = (data?.character_roasts as any)?.[selectedVoice];
        if (charRoast && charRoast.trim().length > 0) {
          textToSpeak = charRoast;
        } else if (COMEDY_PROFILES[selectedVoice]) {
          try {
            textToSpeak = await generateCustomVoiceRoast(
              data?.food_name || 'questo piatto',
              currentCalories,
              COMEDY_PROFILES[selectedVoice],
              data?.roast_speech
            );
          } catch {
            textToSpeak = data?.roast_speech || '';
          }
        }
      }

      if (textToSpeak) {
        customRoastsRef.current[selectedVoice] = textToSpeak;
        setCustomRoasts((prev) => ({ ...prev, [selectedVoice]: textToSpeak }));
      }
    }

    if (!textToSpeak) {
      textToSpeak =
        (data?.character_roasts as any)?.[selectedVoice] ||
        data?.character_roasts?.zio_italiano ||
        data?.roast_speech ||
        '';
    }

    if (!textToSpeak) {
      setIsLoadingAudio(false);
      return;
    }

    // 1. VERIFICA CACHE LOCALE (Se l'audio per questo personaggio è già stato generato, riproduci a 0ms!)
    const cachedUri = audioCacheRef.current[selectedVoice];
    if (cachedUri) {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const audio = new (window as any).Audio(cachedUri);
          webAudioRef.current = audio;
          audio.onplay = () => setIsPlaying(true);
          audio.onpause = () => setIsPlaying(false);
          audio.onended = () => setIsPlaying(false);
          audio.onerror = () => setIsPlaying(false);
          setIsLoadingAudio(false);
          await audio.play();
          setIsPlaying(true);
          return;
        } else {
          const fileInfo = await FileSystem.getInfoAsync(cachedUri);
          if (fileInfo.exists) {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              allowsRecordingIOS: false,
              staysActiveInBackground: false,
            });

            const { sound } = await Audio.Sound.createAsync(
              { uri: cachedUri },
              { shouldPlay: true },
              (status) => {
                if (status.isLoaded) {
                  setIsPlaying(status.isPlaying);
                  if (status.didJustFinish) {
                    setIsPlaying(false);
                  }
                } else {
                  setIsPlaying(false);
                }
              }
            );

            if (playbackReqIdRef.current !== reqId) {
              sound.unloadAsync().catch(() => {});
              return;
            }

            soundRef.current = sound;
            setIsLoadingAudio(false);
            setIsPlaying(true);
            return;
          }
        }
      } catch (cacheErr) {
        console.warn('[TTS Cache Replay Warning]:', cacheErr);
      }
    }

    const baseUrl = await getDynamicTtsApiUrl(forceRefreshUrl);
    const endpoint = `${baseUrl}/api/v1/tts/roast`;

    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        });
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/wav',
        },
        body: JSON.stringify({
          text: textToSpeak,
          voice: selectedVoice,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Se l'utente nel frattempo ha cambiato personaggio, ignora la risposta obsoleta
      if (playbackReqIdRef.current !== reqId) {
        return;
      }

      // 1. GESTIONE WEB BROWSER
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        audioCacheRef.current[selectedVoice] = audioUrl;

        const audio = new (window as any).Audio(audioUrl);
        webAudioRef.current = audio;

        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);

        setIsLoadingAudio(false);
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (playErr: any) {
          setIsPlaying(false);
        }
        return;
      }

      // 2. GESTIONE MOBILE NATIVA (iOS / Android)
      const arrayBuffer = await response.arrayBuffer();
      if (playbackReqIdRef.current !== reqId) return;

      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);
      const tempWavPath = `${FileSystem.cacheDirectory}mealpulse_roast_${selectedVoice}_${Date.now()}.wav`;

      await FileSystem.writeAsStringAsync(tempWavPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (playbackReqIdRef.current !== reqId) {
        FileSystem.deleteAsync(tempWavPath, { idempotent: true }).catch(() => {});
        return;
      }

      audioCacheRef.current[selectedVoice] = tempWavPath;

      const { sound } = await Audio.Sound.createAsync(
        { uri: tempWavPath },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          } else {
            setIsPlaying(false);
          }
        }
      );

      if (playbackReqIdRef.current !== reqId) {
        sound.unloadAsync().catch(() => {});
        return;
      }

      soundRef.current = sound;
      setIsLoadingAudio(false);
      setIsPlaying(true);
      try {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    } catch (err: any) {
      if (playbackReqIdRef.current !== reqId) return;
      console.warn('[TTS Playback Warning]:', err?.message || err);
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setAudioError(`Server TTS non raggiungibile (${baseUrl})`);
    }
  };

  // Autoplay all'apertura del modale se roast è presente
  useEffect(() => {
    if (visible && (data?.roast_speech || data?.character_roasts)) {
      const timer = setTimeout(() => {
        fetchAndPlayAudio(voice);
      }, 450);
      return () => {
        clearTimeout(timer);
        stopAndUnloadAudio();
      };
    } else {
      stopAndUnloadAudio();
      cleanupAudioCache();
    }
  }, [visible, data?.roast_speech, data?.character_roasts]);

  const handleTogglePlayPause = async () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }

    // Modalità Web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (webAudioRef.current) {
        if (isPlaying) {
          webAudioRef.current.pause();
          setIsPlaying(false);
        } else {
          try {
            if (webAudioRef.current.ended) {
              webAudioRef.current.currentTime = 0;
            }
            await webAudioRef.current.play();
            setIsPlaying(true);
          } catch {
            fetchAndPlayAudio(voice);
          }
        }
      } else {
        fetchAndPlayAudio(voice);
      }
      return;
    }

    // Modalità Mobile Nativa
    if (isPlaying) {
      try {
        await soundRef.current?.pauseAsync();
      } catch {}
      setIsPlaying(false);
    } else if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (
            status.didJustFinish ||
            (status.durationMillis && status.positionMillis >= status.durationMillis - 120)
          ) {
            // Riavvolgi dall'inizio se l'audio è terminato
            await soundRef.current.replayAsync();
          } else {
            await soundRef.current.playAsync();
          }
          setIsPlaying(true);
        } else {
          fetchAndPlayAudio(voice);
        }
      } catch {
        fetchAndPlayAudio(voice);
      }
    } else {
      fetchAndPlayAudio(voice);
    }
  };

  const handleClose = async () => {
    await stopAndUnloadAudio();
    await cleanupAudioCache();
    onClose();
  };

  const handleConfirmWithAudioStop = async () => {
    await stopAndUnloadAudio();
    await cleanupAudioCache();
    handleConfirm();
  };

  if (!data) return null;

  const currentCalories = Math.round(data.calories * servingMultiplier);
  const currentProtein = Math.round(data.protein_g * servingMultiplier);
  const currentCarbs = Math.round(data.carbs_g * servingMultiplier);
  const currentFat = Math.round(data.fat_g * servingMultiplier);
  const currentWeight = Math.round((data.estimated_weight_g || 100) * servingMultiplier);

  const healthScore = data.health_score || (data.protein_g > 15 && data.fat_g < 15 ? 'A' : data.fat_g > 20 ? 'C' : 'B');

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'A': return '#4CAF50';
      case 'B': return '#84CC16';
      case 'C': return '#FFA726';
      case 'D': return '#EF4444';
      default: return '#84CC16';
    }
  };

  const getScoreDescription = (score: string) => {
    switch (score) {
      case 'A':
        return 'Super nutriente, ricco di proteine magre e vitamine con grassi minimi.';
      case 'B':
        return 'Sano e bilanciato. Ottimo apporto energetico e macronutrienti stabili.';
      case 'C':
        return data.insights || 'Equilibrio moderato tra nutrienti, grassi o zuccheri. Da consumare con moderazione.';
      case 'D':
        return 'Piatto ipercalorico o ricco di grassi saturi. Da bilanciare con verdure e idratazione.';
      default:
        return data.insights || 'Profilo nutrizionale bilanciato.';
    }
  };

  const handleConfirm = () => {
    onConfirm({
      ...data,
      calories: currentCalories,
      protein_g: currentProtein,
      carbs_g: currentCarbs,
      fat_g: currentFat,
      estimated_weight_g: currentWeight,
      servingMultiplier,
    });
  };

  const activeChar =
    COMEDY_CHARACTERS.find((c) => c.id === voice) ||
    (customSelectedVoice && customSelectedVoice.id === voice
      ? {
          id: customSelectedVoice.id as any,
          name: customSelectedVoice.name,
          emoji: customSelectedVoice.emoji,
          desc: `${customSelectedVoice.styleTag} • ${customSelectedVoice.personality}`,
          isProOnly: false,
        }
      : COMEDY_CHARACTERS[0]);

  const currentRoastText =
    customRoasts[voice] ||
    (data.character_roasts as any)?.[voice] ||
    (voice === 'zio_italiano' ? (data.character_roasts?.zio_italiano || data.roast_speech) : undefined) ||
    (isLoadingAudio ? `Elaborazione roast per ${activeChar.name}...` : (data.character_roasts?.zio_italiano || data.roast_speech || ''));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#0B1410' : '#F2F9F2' }]}>
        {/* Top Close Button */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.coral} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Dish Title & Image Row */}
          <View style={styles.dishHeaderRow}>
            <View style={styles.titleAndMacrosCol}>
              <Text style={[styles.dishTitle, { color: colors.textPrimary }]}>
                {data.food_name}
              </Text>

              {/* 2x2 Macro Grid */}
              <View style={styles.macrosGrid}>
                <View style={styles.macroCell}>
                  <Text style={[styles.macroNum, { color: colors.textPrimary }]}>{currentCalories}</Text>
                  <Text style={styles.macroUnit}>{t('kcal')}</Text>
                </View>
                <View style={styles.macroCell}>
                  <Text style={[styles.macroNum, { color: colors.textPrimary }]}>{currentProtein}g</Text>
                  <Text style={styles.macroUnit}>{t('protein_left')}</Text>
                </View>
                <View style={styles.macroCell}>
                  <Text style={[styles.macroNum, { color: colors.textPrimary }]}>{currentCarbs}g</Text>
                  <Text style={styles.macroUnit}>{t('carb_left')}</Text>
                </View>
                <View style={styles.macroCell}>
                  <Text style={[styles.macroNum, { color: colors.textPrimary }]}>{currentFat}g</Text>
                  <Text style={styles.macroUnit}>{t('fat_left')}</Text>
                </View>
              </View>
            </View>

            {/* Food Image / Visual */}
            <View style={styles.foodImageContainer}>
              {data.image_uri && !imageLoadFailed ? (
                <Image
                  source={{ uri: data.image_uri }}
                  style={styles.foodImage}
                  onError={() => {
                    console.warn('[AINutritionResultModal] Image failed to load, falling back to placeholder');
                    setImageLoadFailed(true);
                  }}
                />
              ) : (
                <View style={[styles.foodImagePlaceholder, { backgroundColor: isDarkMode ? '#1A2E22' : '#EFF8F2' }]}>
                  <Text style={{ fontSize: 64 }}>🍽️</Text>
                </View>
              )}
            </View>
          </View>

          {/* CHEF ROAST CARD (Kokoro-82M Comedy Personalities) */}
          {currentRoastText ? (
            <View style={styles.sectionCard}>
              <View style={styles.roastSectionHeader}>
                <View style={styles.roastBadgePill}>
                  <Text style={styles.roastBadgeText}>CHEF ROAST 🔥</Text>
                </View>
                <Text style={[styles.roastSubheading, { color: colors.textSecondary }]}>
                  {activeChar.emoji} {activeChar.name}
                </Text>
              </View>

              {/* Character Selector Horizontal Carousel */}
              <View style={styles.charPickerWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.charScrollContainer}
                >
                  {COMEDY_CHARACTERS.map((char) => {
                    const isSelected = voice === char.id;
                    const isLocked = char.isProOnly && !isPro && !unlockedCharacters[char.id];
                    return (
                      <TouchableOpacity
                        key={char.id}
                        style={[
                          styles.charPill,
                          isSelected
                            ? [styles.charPillActive, { backgroundColor: colors.coral }]
                            : [styles.charPillInactive, { backgroundColor: isDarkMode ? '#182C22' : '#EFF5F0' }],
                          isLocked && styles.charPillLocked,
                        ]}
                        onPress={() => handleSelectCharacter(char)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.charEmoji}>{char.emoji}</Text>
                        <Text
                          style={[
                            styles.charName,
                            isSelected ? styles.charNameActive : { color: colors.textSecondary },
                          ]}
                        >
                          {char.name}
                        </Text>
                        {isLocked && (
                          <View style={styles.lockBadge}>
                            <Ionicons name="lock-closed" size={10} color={isSelected ? '#FFFFFF' : '#F59E0B'} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Voce del modello selezionata dalla ricerca (se attiva) */}
                  {customSelectedVoice && !COMEDY_CHARACTERS.some((c) => c.id === customSelectedVoice.id) && (() => {
                    const isCustomLocked = !isPro && !unlockedCharacters[customSelectedVoice.id];
                    const isCustomSelected = voice === customSelectedVoice.id;
                    return (
                      <TouchableOpacity
                        key={customSelectedVoice.id}
                        style={[
                          styles.charPill,
                          isCustomSelected
                            ? [styles.charPillActive, { backgroundColor: colors.coral }]
                            : [styles.charPillInactive, { backgroundColor: isDarkMode ? '#182C22' : '#EFF5F0' }],
                          isCustomLocked && styles.charPillLocked,
                        ]}
                        onPress={() => handleSelectCustomVoice(customSelectedVoice)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.charEmoji}>{customSelectedVoice.emoji}</Text>
                        <Text
                          style={[
                            styles.charName,
                            isCustomSelected ? styles.charNameActive : { color: colors.textSecondary },
                          ]}
                        >
                          {customSelectedVoice.name}
                        </Text>
                        {isCustomLocked && (
                          <View style={styles.lockBadge}>
                            <Ionicons name="lock-closed" size={10} color={isCustomSelected ? '#FFFFFF' : '#F59E0B'} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })()}

                  {/* Opzione 6: Scegli altre voci (apre la ricerca tra le 58 voci di base del modello) */}
                  <TouchableOpacity
                    style={[
                      styles.charPill,
                      styles.chooseMorePill,
                      {
                        backgroundColor: isDarkMode ? '#182C22' : '#EFF5F0',
                        borderColor: isDarkMode ? '#2D4B39' : '#DDE8E0',
                      },
                    ]}
                    onPress={() => {
                      try {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      setShowVoiceSelectorModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="search" size={14} color={colors.coral} />
                    <Text style={[styles.charName, { color: colors.coral, fontWeight: '700' }]}>
                      Scegli altre
                    </Text>
                    <View style={styles.voiceCountBadge}>
                      <Text style={styles.voiceCountBadgeText}>58+</Text>
                    </View>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <View style={[styles.roastBox, { backgroundColor: isDarkMode ? '#14231B' : '#FFFFFF' }]}>
                {/* Citazione Roast */}
                <Text style={[styles.roastQuoteText, { color: colors.textPrimary }]}>
                  "{currentRoastText}"
                </Text>

                {/* Player Audio Bar con Visualizer animato */}
                <View style={[styles.roastPlayerBar, { backgroundColor: isDarkMode ? '#0E1913' : '#F4FAF5' }]}>
                  <TouchableOpacity
                    style={[styles.roastPlayBtn, { backgroundColor: colors.coral }]}
                    onPress={handleTogglePlayPause}
                    disabled={isLoadingAudio}
                    activeOpacity={0.8}
                  >
                    {isLoadingAudio ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={16}
                        color="#FFFFFF"
                        style={{ marginLeft: isPlaying ? 0 : 2 }}
                      />
                    )}
                  </TouchableOpacity>

                  {/* Frequency Wave Visualizer */}
                  <View style={styles.waveBarsContainer}>
                    <RNAnimated.View
                      style={[
                        styles.waveBar,
                        { backgroundColor: isPlaying ? colors.coral : '#94A3B8' },
                        { transform: [{ scaleY: waveAnim1 }] },
                      ]}
                    />
                    <RNAnimated.View
                      style={[
                        styles.waveBar,
                        { backgroundColor: isPlaying ? colors.coral : '#94A3B8' },
                        { transform: [{ scaleY: waveAnim2 }] },
                      ]}
                    />
                    <RNAnimated.View
                      style={[
                        styles.waveBar,
                        { backgroundColor: isPlaying ? colors.coral : '#94A3B8' },
                        { transform: [{ scaleY: waveAnim3 }] },
                      ]}
                    />
                    <RNAnimated.View
                      style={[
                        styles.waveBar,
                        { backgroundColor: isPlaying ? colors.coral : '#94A3B8' },
                        { transform: [{ scaleY: waveAnim2 }] },
                      ]}
                    />
                    <RNAnimated.View
                      style={[
                        styles.waveBar,
                        { backgroundColor: isPlaying ? colors.coral : '#94A3B8' },
                        { transform: [{ scaleY: waveAnim1 }] },
                      ]}
                    />
                  </View>

                  <Text style={[styles.playerStatusLabel, { color: colors.textSecondary }]}>
                    {isLoadingAudio
                      ? `Sintesi vocale ${activeChar.name}...`
                      : isPlaying
                      ? `Recita ${activeChar.emoji}...`
                      : 'Tocca per ascoltare'}
                  </Text>
                </View>

                {audioError ? (
                  <TouchableOpacity
                    style={styles.roastErrorBox}
                    onPress={() => fetchAndPlayAudio(voice, true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="warning-outline" size={13} color="#FFA726" />
                    <Text style={styles.roastErrorLabel}>
                      TTS non connesso • Tocca per riprovare
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Serving Section */}
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>{t('serving')}</Text>
            <View style={[styles.servingBox, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF' }]}>
              {/* Stepper */}
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setServingMultiplier(Math.max(0.5, +(servingMultiplier - 0.5).toFixed(1)))}
                >
                  <Ionicons name="remove" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>
                  {servingMultiplier.toFixed(1)}
                </Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setServingMultiplier(+(servingMultiplier + 0.5).toFixed(1))}
                >
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Portion Dropdown Display */}
              <View style={[styles.portionDisplay, { borderColor: isDarkMode ? '#22382D' : '#E2E8F0' }]}>
                <Text style={[styles.portionText, { color: colors.textPrimary }]}>
                  {t('portion')} ({currentWeight}g)
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94A3B8" />
              </View>
            </View>
          </View>

          {/* Nutrition Health Grade Section */}
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>{t('nutrition')}</Text>
            <View style={[styles.gradeCard, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF' }]}>
              <View style={[styles.gradeCircle, { borderColor: getScoreColor(healthScore) }]}>
                <Text style={[styles.gradeLetter, { color: getScoreColor(healthScore) }]}>
                  {healthScore}
                </Text>
              </View>
              <View style={styles.gradeDetails}>
                <Text style={[styles.gradeDesc, { color: colors.textSecondary }]}>
                  {getScoreDescription(healthScore)}
                </Text>
              </View>
            </View>
          </View>

          {/* Medical Disclaimer */}
          <View style={[styles.medicalNoteBox, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
            <Ionicons name="medkit-outline" size={14} color={colors.lime} style={{ marginTop: 2 }} />
            <Text style={[styles.medicalNoteText, { color: colors.textSecondary }]}>
              {t('medical_disclaimer_text')}
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Confirm Button */}
        <View style={styles.bottomBarContainer}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.coral }]}
            onPress={handleConfirmWithAudioStop}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmBtnText}>{t('confirm')}</Text>
          </TouchableOpacity>
        </View>

        {/* Modal Sblocco Personaggio con Rewarded Ad o Pro */}
        <RoastUnlockModal
          visible={showUnlockModal}
          character={characterToUnlock}
          onClose={() => setShowUnlockModal(false)}
          onUnlocked={handleCharacterUnlocked}
          onGoPro={handleGoPro}
        />

        {/* Modal Selezione Voci Default XTTS-v2 */}
        <VoiceSelectorModal
          visible={showVoiceSelectorModal}
          onClose={() => setShowVoiceSelectorModal(false)}
          onSelectVoice={handleSelectCustomVoice}
          currentVoiceId={voice}
          isPro={isPro}
          unlockedVoices={unlockedCharacters}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dishHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleAndMacrosCol: {
    flex: 1,
    marginRight: 16,
  },
  dishTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroCell: {
    width: '45%',
  },
  macroNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  macroUnit: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  foodImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  foodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  foodImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  // Chef Roast Specific Styles
  roastSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  roastBadgePill: {
    backgroundColor: '#FF6B4A20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B4A40',
  },
  roastBadgeText: {
    color: '#FF6B4A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roastSubheading: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Character Selector Carousel
  charPickerWrapper: {
    marginBottom: 10,
  },
  charScrollContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  charPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 6,
  },
  charPillActive: {
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  charPillInactive: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  charEmoji: {
    fontSize: 14,
  },
  charName: {
    fontSize: 12,
    fontWeight: '700',
  },
  charNameActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  charPillLocked: {
    opacity: 0.9,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  lockBadge: {
    marginLeft: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  chooseMorePill: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  voiceCountBadge: {
    backgroundColor: '#FF6B4A',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 2,
  },
  voiceCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  roastBox: {
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B4A',
  },
  roastQuoteText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    fontWeight: '600',
    marginBottom: 14,
  },
  roastPlayerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 12,
  },
  roastPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  waveBarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
    width: 36,
  },
  waveBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  playerStatusLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  roastErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  roastErrorLabel: {
    fontSize: 11,
    color: '#FFA726',
    fontWeight: '500',
  },
  // Serving Styles
  servingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  portionDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  portionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Nutrition Styles
  gradeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  gradeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeLetter: {
    fontSize: 24,
    fontWeight: '900',
  },
  gradeDetails: {
    flex: 1,
  },
  gradeDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  confirmBtn: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  medicalNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 80,
  },
  medicalNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
});
