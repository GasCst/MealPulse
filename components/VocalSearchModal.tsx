import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  parseMealFromVoiceText,
  parseMealFromAudioBase64,
  VoiceMealItem,
  VoiceMealParsedResult,
} from '@/services/aiVisionService';

interface VocalSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onMealsAdded: (meals: { name: string; calories: number; protein: number; carbs: number; fat: number; weightG?: number; portion?: string }[]) => void;
}

export const VocalSearchModal: React.FC<VocalSearchModalProps> = ({
  visible,
  onClose,
  onMealsAdded,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();

  const [speechText, setSpeechText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationSec, setRecordingDurationSec] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<VoiceMealParsedResult | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setSpeechText('');
      setError(null);
      setParsedResult(null);
      setIsAnalyzing(false);
      setIsRecording(false);
      setRecordingDurationSec(0);
    } else {
      cleanupRecording();
    }
  }, [visible]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      animation?.stop();
    };
  }, [isRecording]);

  const cleanupRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setParsedResult(null);

      // 1. Request microphone permissions
      const permRes = await Audio.requestPermissionsAsync();
      if (!permRes.granted) {
        setError(
          language === 'it'
            ? 'Autorizza il microfono nelle impostazioni per usare la voce.'
            : 'Please grant microphone permissions to use voice search.'
        );
        return;
      }

      // 2. Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // 3. Prepare high quality recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDurationSec(0);

      // 4. Start duration counter
      timerRef.current = setInterval(() => {
        setRecordingDurationSec((prev) => prev + 1);
      }, 1000);

      // 5. Safety auto-stop after 15 seconds
      autoStopTimeoutRef.current = setTimeout(() => {
        if (recordingRef.current) {
          stopRecordingAndAnalyze();
        }
      }, 15000);
    } catch (err: any) {
      console.warn('[VocalSearchModal] startRecording error:', err);
      setIsRecording(false);
      setError(
        language === 'it'
          ? 'Impossibile avviare il microfono. Riprova.'
          : 'Could not start microphone. Please retry.'
      );
    }
  };

  const stopRecordingAndAnalyze = async () => {
    if (!recordingRef.current) return;

    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);

    setIsRecording(false);
    setIsAnalyzing(true);
    setError(null);

    try {
      const recording = recordingRef.current;
      recordingRef.current = null;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error(
          language === 'it' ? 'Nessun audio registrato.' : 'No audio recorded.'
        );
      }

      // Read audio file as Base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      if (!base64Audio || base64Audio.length < 50) {
        throw new Error(
          language === 'it'
            ? 'Registrazione troppo breve. Parla tenendo premuto o toccando il microfono.'
            : 'Recording too short. Please speak again.'
        );
      }

      // Determine MIME type
      const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';

      // Send directly to Gemini Multimodal Audio model
      const result = await parseMealFromAudioBase64(base64Audio, mimeType);

      if (result.speech_transcription) {
        setSpeechText(result.speech_transcription);
      }
      setParsedResult(result);
    } catch (e: any) {
      console.warn('[VocalSearchModal] Audio analysis error:', e);
      // If audio recognition failed, check if user had typed text
      if (speechText.trim()) {
        try {
          const textResult = await parseMealFromVoiceText(speechText.trim());
          setParsedResult(textResult);
          return;
        } catch {}
      }
      setError(
        e.message ||
          (language === 'it'
            ? 'Errore durante l\'ascolto. Riprova parlando vicino al microfono.'
            : 'Audio processing error. Please try speaking closer to microphone.')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualTextAnalyze = async () => {
    const text = speechText.trim();
    if (!text) {
      setError(
        language === 'it'
          ? 'Scrivi o detta cosa hai mangiato.'
          : 'Please enter or dictate what you ate.'
      );
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await parseMealFromVoiceText(text);
      setParsedResult(result);
    } catch (e: any) {
      console.warn('[VocalSearchModal] manual text analyze error:', e);
      setError(
        e.message ||
          (language === 'it'
            ? 'Errore durante l\'analisi del testo. Riprova.'
            : 'Text analysis error. Please retry.')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyPreset = (preset: string) => {
    setSpeechText(preset);
    setIsAnalyzing(true);
    setError(null);
    parseMealFromVoiceText(preset)
      .then((res) => setParsedResult(res))
      .catch((e) => setError(e.message))
      .finally(() => setIsAnalyzing(false));
  };

  const handleConfirmAll = () => {
    if (!parsedResult || parsedResult.items.length === 0) return;

    const formatted = parsedResult.items.map((it) => ({
      name: it.name,
      calories: it.calories,
      protein: it.protein_g,
      carbs: it.carbs_g,
      fat: it.fat_g,
      weightG: it.weight_g || 100,
      portion: it.portion || `${it.weight_g || 100}g`,
    }));

    onMealsAdded(formatted);
    onClose();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const presets = language === 'it' ? [
    '150g di riso basmati con 200g di petto di pollo e 1 mela',
    '2 fette di pane tostato con 1 avocado e 2 uova',
    '1 vasetto di yogurt greco con 30g di noci e 1 banana',
    '1 piatto di pasta al pomodoro con 20g di parmigiano e olio',
  ] : [
    '150g basmati rice with 200g grilled chicken and 1 apple',
    '2 slices whole toast with 1 avocado and 2 boiled eggs',
    '1 tub greek yogurt with 30g walnuts and 1 banana',
    '1 bowl tomato pasta with 20g parmesan cheese and olive oil',
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO AI</Text>
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  {t('vocal_ai_search', 'Scansione Vocale AI')} 🎙️
                </Text>
                <Text style={styles.headerSub}>Google Gemini Multimodal Audio AI</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Animated Mic Section */}
            <View style={styles.micSection}>
              <Animated.View style={[styles.micPulseRing, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity
                  style={[styles.micBtn, isRecording && styles.micBtnRecording]}
                  onPress={() => {
                    if (isRecording) {
                      stopRecordingAndAnalyze();
                    } else {
                      startRecording();
                    }
                  }}
                  activeOpacity={0.8}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name={isRecording ? 'stop' : 'mic'}
                      size={isRecording ? 32 : 38}
                      color="#FFFFFF"
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>

              {isRecording ? (
                <View style={styles.recordingStatusBox}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTimerText}>{formatTimer(recordingDurationSec)}</Text>
                  <Text style={styles.recordingPromptText}>
                    {language === 'it' ? 'Parla adesso... Tocca per fermare e calcolare' : 'Speaking... Tap to stop & calculate'}
                  </Text>
                </View>
              ) : isAnalyzing ? (
                <Text style={[styles.micPrompt, { color: '#8B5CF6' }]}>
                  ⚡ {language === 'it' ? 'Gemini AI sta ascoltando e calcolando i macro...' : 'Gemini AI is analyzing your voice & macros...'}
                </Text>
              ) : (
                <Text style={[styles.micPrompt, { color: colors.textSecondary }]}>
                  {language === 'it' ? 'Tocca il microfono per parlare o scrivi sotto' : 'Tap microphone to speak or type below'}
                </Text>
              )}
            </View>

            {/* Input Box for Speech Transcript / Manual Editing */}
            <View style={[styles.inputBox, { backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB', borderColor: isDarkMode ? '#374151' : '#E5E7EB' }]}>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                placeholder={t('vocal_ai_placeholder', 'Es: "150g di riso basmati, 200g di pollo e 1 mela"')}
                placeholderTextColor={colors.textSecondary}
                value={speechText}
                onChangeText={setSpeechText}
                multiline
                numberOfLines={3}
                editable={!isAnalyzing && !isRecording}
              />

              {speechText.length > 0 && !isAnalyzing && !isRecording && (
                <TouchableOpacity
                  style={styles.analyzeCtaBtn}
                  onPress={handleManualTextAnalyze}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  <Text style={styles.analyzeCtaText}>
                    {language === 'it' ? 'Analizza con Gemini AI ⚡' : 'Analyze with Gemini AI ⚡'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Error banner */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Parsed Result Display */}
            {parsedResult && (
              <View style={[styles.resultCard, { backgroundColor: isDarkMode ? '#1E1B4B' : '#F5F3FF', borderColor: '#8B5CF6' }]}>
                <View style={styles.resultHeader}>
                  <View>
                    <Text style={[styles.resultTitle, { color: isDarkMode ? '#E0E7FF' : '#4C1D95' }]}>
                      {parsedResult.meal_title}
                    </Text>
                    <Text style={styles.resultSub}>
                      {parsedResult.items.length} {language === 'it' ? 'alimenti riconosciuti' : 'items recognized'}
                    </Text>
                  </View>
                  <View style={styles.calBadge}>
                    <Text style={styles.calBadgeText}>{parsedResult.total_calories} kcal</Text>
                  </View>
                </View>

                {/* Macro Summary Strip */}
                <View style={styles.macroStrip}>
                  <Text style={[styles.macroPill, { color: '#EF4444' }]}>P: {parsedResult.total_protein_g}g</Text>
                  <Text style={[styles.macroPill, { color: '#3B82F6' }]}>C: {parsedResult.total_carbs_g}g</Text>
                  <Text style={[styles.macroPill, { color: '#EAB308' }]}>F: {parsedResult.total_fat_g}g</Text>
                </View>

                {/* Item List */}
                <View style={styles.itemsList}>
                  {parsedResult.items.map((it, idx) => (
                    <View key={idx} style={[styles.itemRow, { borderBottomColor: isDarkMode ? '#312E81' : '#EDE9FE' }]}>
                      <Text style={{ fontSize: 20 }}>{it.emoji || '🍽️'}</Text>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.itemName, { color: isDarkMode ? '#FFFFFF' : '#1F2937' }]}>{it.name}</Text>
                        <Text style={styles.itemPortion}>{it.portion || `${it.weight_g}g`}</Text>
                      </View>
                      <Text style={[styles.itemKcal, { color: isDarkMode ? '#C7D2FE' : '#6D28D9' }]}>
                        {it.calories} kcal
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Add to diary button */}
                <TouchableOpacity
                  style={styles.addAllBtn}
                  onPress={handleConfirmAll}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.addAllBtnText}>
                    {t('vocal_add_to_diary', 'Aggiungi al Diario ➕')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Voice Suggestions */}
            {!parsedResult && !isRecording && (
              <View style={styles.presetsBox}>
                <Text style={[styles.presetsTitle, { color: colors.textSecondary }]}>
                  💡 {language === 'it' ? 'Esempi di Frasi Vocali:' : 'Voice Examples:'}
                </Text>
                {presets.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.presetChip, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}
                    onPress={() => handleApplyPreset(p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color="#8B5CF6" />
                    <Text style={[styles.presetText, { color: colors.textPrimary }]}>"{p}"</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  micPulseRing: {
    padding: 8,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  micBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  micBtnRecording: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  micPrompt: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  recordingStatusBox: {
    alignItems: 'center',
    marginTop: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginBottom: 4,
  },
  recordingTimerText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  recordingPromptText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  inputBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  textInput: {
    fontSize: 14,
    minHeight: 55,
    textAlignVertical: 'top',
  },
  analyzeCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
    gap: 6,
  },
  analyzeCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginTop: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  resultSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  calBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  calBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  macroStrip: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  macroPill: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemsList: {
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemPortion: {
    fontSize: 11,
    color: '#6B7280',
  },
  itemKcal: {
    fontSize: 13,
    fontWeight: '800',
  },
  addAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 12,
    gap: 8,
  },
  addAllBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  presetsBox: {
    marginTop: 16,
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  presetText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
});
