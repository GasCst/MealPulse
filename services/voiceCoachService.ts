import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import * as Speech from 'expo-speech';
import { getDynamicTtsApiUrl } from '@/services/remoteConfigService';
import { ModelVoiceItem } from '@/components/VoiceSelectorModal';
import { cleanSpokenText, coachFallback, getVoiceLanguage, isNeapolitanVoice, speechCacheKey, spokenTextRules } from '@/services/voiceTextStyle';
import { LanguageCode } from '@/constants/translations';

const PREFERRED_VOICE_STORAGE_KEY = '@mealpulse_preferred_coach_voice';
const MORNING_BRIEFING_CACHE_KEY = '@mealpulse_morning_briefing_v3';

export const DEFAULT_COACH_VOICE: ModelVoiceItem = {
  id: 'zio_italiano',
  name: 'Zio Napoletano',
  gender: 'character',
  category: 'roast_character',
  emoji: '🤌',
  desc: 'Personaggio • Uè wagliò! Verace e passionale',
  personality: 'Passionale, viscerale, protettivo e difensore della buona alimentazione con dialetto partenopeo',
  timbre: 'Caldo, espressivo, teatrale',
  cadence: 'Viscerale con ritmo partenopeo',
  styleTag: 'Zio Napoletano',
  isProOnly: false,
};

// Listeners per aggiornamento real-time in tutta l'app
type VoiceChangeListener = (voice: ModelVoiceItem) => void;
type PlaybackStateListener = (isPlaying: boolean, isLoading: boolean, currentVoiceId?: string) => void;

class VoiceCoachService {
  private preferredVoice: ModelVoiceItem = DEFAULT_COACH_VOICE;
  private isLoaded = false;
  private voiceListeners: Set<VoiceChangeListener> = new Set();
  private playbackListeners: Set<PlaybackStateListener> = new Set();

  private currentSound: Audio.Sound | null = null;
  private currentWebAudio: any = null;
  private isPlaying = false;
  private isLoading = false;
  private activeVoiceId: string | null = null;
  private audioCache: Record<string, string> = {};

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const stored = await AsyncStorage.getItem(PREFERRED_VOICE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          this.preferredVoice = parsed;
        }
      }
    } catch (e) {
      console.warn('[VoiceCoachService] Error loading preferred voice:', e);
    } finally {
      this.isLoaded = true;
      this.notifyVoiceListeners();
    }
  }

  public async getPreferredCoachVoice(): Promise<ModelVoiceItem> {
    if (!this.isLoaded) {
      await this.init();
    }
    return this.preferredVoice;
  }

  public async setPreferredCoachVoice(voice: ModelVoiceItem): Promise<void> {
    this.preferredVoice = voice;
    try {
      await AsyncStorage.setItem(PREFERRED_VOICE_STORAGE_KEY, JSON.stringify(voice));
    } catch (e) {
      console.warn('[VoiceCoachService] Error saving preferred voice:', e);
    }
    this.notifyVoiceListeners();
  }

  public subscribePreferredVoice(cb: VoiceChangeListener): () => void {
    this.voiceListeners.add(cb);
    cb(this.preferredVoice);
    return () => {
      this.voiceListeners.delete(cb);
    };
  }

  private notifyVoiceListeners() {
    for (const cb of this.voiceListeners) {
      try {
        cb(this.preferredVoice);
      } catch (e) {
        console.warn('[VoiceCoachService] Error in voice listener:', e);
      }
    }
  }

  public subscribePlaybackState(cb: PlaybackStateListener): () => void {
    this.playbackListeners.add(cb);
    cb(this.isPlaying, this.isLoading, this.activeVoiceId || undefined);
    return () => {
      this.playbackListeners.delete(cb);
    };
  }

  private setPlaybackState(playing: boolean, loading: boolean, voiceId?: string) {
    this.isPlaying = playing;
    this.isLoading = loading;
    if (voiceId !== undefined) {
      this.activeVoiceId = voiceId;
    }
    for (const cb of this.playbackListeners) {
      try {
        cb(this.isPlaying, this.isLoading, this.activeVoiceId || undefined);
      } catch (e) {
        console.warn('[VoiceCoachService] Error in playback listener:', e);
      }
    }
  }

  public getTtsApiUrl(): string {
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
  }

  public async stopAudio(): Promise<void> {
    try {
      Speech.stop();
    } catch {}

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (this.currentWebAudio) {
        try {
          this.currentWebAudio.pause();
          this.currentWebAudio.currentTime = 0;
        } catch {}
        this.currentWebAudio = null;
      }
    }

    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
      } catch {}
      this.currentSound = null;
    }

    this.setPlaybackState(false, false);
  }

  /**
   * Fallback istantaneo a Expo Speech se XTTS backend non è raggiungibile
   */
  private async playNativeSpeechFallback(text: string, voiceId: string, language: LanguageCode): Promise<() => Promise<void>> {
    console.log('[VoiceCoachService] Using Expo Speech native synthesizer fallback for voice:', voiceId);
    this.setPlaybackState(true, false, voiceId);

    try {
      Speech.stop();
    } catch {}

    const cleanText = text.replace(/\.{2,}/g, '. ').replace(/[_*#]/g, '').trim();

    return new Promise((resolve) => {
      Speech.speak(cleanText, {
        language,
        pitch: 1.0,
        rate: 1.0,
        onStart: () => {
          this.setPlaybackState(true, false, voiceId);
        },
        onDone: () => {
          this.setPlaybackState(false, false, voiceId);
        },
        onStopped: () => {
          this.setPlaybackState(false, false, voiceId);
        },
        onError: (err) => {
          console.warn('[VoiceCoachService] Expo Speech error:', err);
          this.setPlaybackState(false, false, voiceId);
        },
      });

      resolve(async () => {
        try {
          Speech.stop();
        } catch {}
        this.setPlaybackState(false, false, voiceId);
      });
    });
  }

  /**
   * Riproduce una frase usando la voce specificata tramite il server locale con cache e fallback del dispositivo.
   */
  public async playSpeech(
    text: string,
    voiceId?: string
  ): Promise<(() => Promise<void>) | null> {
    await this.stopAudio();

    const currentVoice = voiceId || (await this.getPreferredCoachVoice()).id;
    this.setPlaybackState(false, true, currentVoice);

    const language = await getVoiceLanguage();
    text = cleanSpokenText(text);
    const cacheKey = speechCacheKey(text, currentVoice, language);
    const cachedUri = this.audioCache[cacheKey];

    if (cachedUri) {
      try {
        return await this.playFromUri(cachedUri, currentVoice);
      } catch (e) {
        console.warn('[VoiceCoachService] Cache playback failed, refetching:', e);
      }
    }

    if (Platform.OS !== 'web') {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
          shouldDuckAndroid: true,
        });
      } catch (e) {
        console.warn('[VoiceCoachService] Audio mode config error:', e);
      }
    }

    try {
      const baseUrl = await getDynamicTtsApiUrl();
      const endpoint = `${baseUrl}/api/v1/tts/roast`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/wav',
        },
        body: JSON.stringify({
          text,
          voice: currentVoice,
          language,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`TTS server HTTP ${response.status}`);
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        this.audioCache[cacheKey] = audioUrl;
        return await this.playFromUri(audioUrl, currentVoice);
      }

      // Native iOS / Android
      const arrayBuffer = await response.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);
      const tempWavPath = `${FileSystem.cacheDirectory}coach_${currentVoice}_${Date.now()}.wav`;

      await FileSystem.writeAsStringAsync(tempWavPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      this.audioCache[cacheKey] = tempWavPath;
      return await this.playFromUri(tempWavPath, currentVoice);
    } catch (err) {
      console.warn('[VoiceCoachService] XTTS server unreachable or timed out, triggering instant native speech fallback:', err);
      return await this.playNativeSpeechFallback(text, currentVoice, language);
    }
  }

  private async playFromUri(uri: string, voiceId: string): Promise<() => Promise<void>> {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const audio = new (window as any).Audio(uri);
      this.currentWebAudio = audio;

      audio.onplay = () => this.setPlaybackState(true, false, voiceId);
      audio.onpause = () => this.setPlaybackState(false, false, voiceId);
      audio.onended = () => this.setPlaybackState(false, false, voiceId);
      audio.onerror = () => this.setPlaybackState(false, false, voiceId);

      await audio.play();
      this.setPlaybackState(true, false, voiceId);

      return () => this.stopAudio();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
      (status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            this.setPlaybackState(false, false, voiceId);
          } else {
            this.setPlaybackState(status.isPlaying, false, voiceId);
          }
        } else {
          this.setPlaybackState(false, false, voiceId);
        }
      }
    );

    this.currentSound = sound;
    this.setPlaybackState(true, false, voiceId);

    return () => this.stopAudio();
  }

  // ==========================================
  // FEATURE 1: Morning AI Nutrition Briefing
  // ==========================================
  public async getMorningBriefing(
    targetCalories: number,
    targetProtein: number,
    voice?: ModelVoiceItem
  ): Promise<string> {
    const activeVoice = voice || (await this.getPreferredCoachVoice());
    const language = await getVoiceLanguage();
    const now = new Date();
    const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const cacheKey = `${MORNING_BRIEFING_CACHE_KEY}_${today}_${activeVoice.id}_${language}_${targetCalories}_${targetProtein}`;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch {}

    const prompt = `Sei ${activeVoice.name} (${activeVoice.styleTag}), un coach nutrizionale AI con personalità ${activeVoice.personality}.
Pronuncia il "Morning Nutrition Briefing" di 10 secondi per l'utente appena sveglio.
Dati di oggi: Budget calorico: ${targetCalories} kcal, Target proteine: ${targetProtein}g.
REGOLE:
1. Sii energico, motivante e incisivo, con il tuo stile e cadenza tipica (${activeVoice.cadence}).
2. Massimo 2 frasi concise (15-20 parole).
3. Nessuna promessa medica o giudizio sul corpo.
${spokenTextRules(activeVoice.id, language)}`;

    const generated = await this.callGeminiQuick(prompt);
    const result = cleanSpokenText(
      generated ||
      (language !== 'it' || isNeapolitanVoice(activeVoice.id)
        ? coachFallback('morning', language, activeVoice.id, { calories: targetCalories, protein: targetProtein })
        : activeVoice.id === 'chef_sarcastico'
        ? `Sveglia, asino!... Oggi hai un budget di ${targetCalories} calorie e ${targetProtein}g di proteine... Meno scuse e massima disciplina!`
        : activeVoice.id === 'diva_ironica'
        ? `Buongiorno darling!... Oggi ${targetCalories} calorie e ${targetProtein}g di proteine... Si mangia chic e con classe!`
        : activeVoice.id === 'roastmaster'
        ? `A regà, sveglia!... Oggi se magnano ${targetCalories} calorie e ${targetProtein}g de proteine... Rigorosi e spietati!`
        : activeVoice.id === 'if_sara'
        ? `Buongiorno bestie!... Oggi ${targetCalories} calorie e ${targetProtein}g di proteine... Spacchiamo tutto insieme!`
        : `Buongiorno! Oggi hai un budget di ${targetCalories} calorie e ${targetProtein}g di proteine... Costanza e disciplina!`));

    try {
      await AsyncStorage.setItem(cacheKey, result);
    } catch {}

    return result;
  }

  // ==========================================
  // FEATURE 2: Coach Vocale dell'Idratazione
  // ==========================================
  public async playWaterCheer(intakeMl: number, targetMl: number): Promise<void> {
    const activeVoice = await this.getPreferredCoachVoice();
    const language = await getVoiceLanguage();
    const remainingMl = Math.max(0, targetMl - intakeMl);
    const remainingGlasses = Math.ceil(remainingMl / 250);

    if (language !== 'it' || isNeapolitanVoice(activeVoice.id)) {
      await this.playSpeech(coachFallback('water', language, activeVoice.id, { glasses: remainingGlasses }), activeVoice.id);
      return;
    }

    let phrase = '';
    if (remainingMl <= 0) {
      if (activeVoice.id === 'chef_sarcastico') {
        phrase = "Obiettivo acqua completato!... Finalmente un briciolo di disciplina in questo corpo!";
      } else if (activeVoice.id === 'diva_ironica') {
        phrase = "Target acqua completato darling!... Idratazione da top model, favolosa!";
      } else {
        phrase = `Obiettivo idratazione raggiunto!... ${targetMl} millilitri perfetti nel sistema!`;
      }
    } else {
      if (activeVoice.id === 'chef_sarcastico') {
        const chefPhrases = [
          `Bevi quell'acqua, muoviti!... Mancano ancora ${remainingGlasses} bicchieri alla perfezione!`,
          `Idratazione al ${Math.round((intakeMl / targetMl) * 100)} percento!... Più disciplina in quel bicchiere!`,
          `Un altro sorso completato!... Continua così verso i ${targetMl} millilitri, senza scuse!`,
        ];
        phrase = chefPhrases[Math.floor(Math.random() * chefPhrases.length)];
      } else if (activeVoice.id === 'diva_ironica') {
        const divaPhrases = [
          `Adoro darling!... Mancano solo ${remainingGlasses} bicchieri per una pelle radiosa!`,
          `Bevi con grazia tesoro!... Siamo al ${Math.round((intakeMl / targetMl) * 100)} percento!`,
          `L'idratazione è vita cara!... Continua così verso i ${targetMl} millilitri!`,
        ];
        phrase = divaPhrases[Math.floor(Math.random() * divaPhrases.length)];
      } else {
        const phrases = [
          `Ottimo sorso!... Mancano solo ${remainingGlasses} bicchieri all'obiettivo!`,
          `Bevi fino all'ultima goccia!... Idratazione al ${Math.round((intakeMl / targetMl) * 100)} percento!`,
          `Così si fa!... Metabolismo attivato e idratazione perfetta!`,
          `Un altro bicchiere andato!... Continua così verso i ${targetMl} millilitri!`,
        ];
        phrase = phrases[Math.floor(Math.random() * phrases.length)];
      }
    }

    await this.playSpeech(phrase, activeVoice.id);
  }

  // ==========================================
  // FEATURE 3: Daily Voice Recap (Resoconto Serale)
  // ==========================================
  public async getDailyRecap(
    eatenCal: number,
    targetCal: number,
    burnedCal: number,
    mealsCount: number,
    voice?: ModelVoiceItem
  ): Promise<string> {
    const activeVoice = voice || (await this.getPreferredCoachVoice());
    const language = await getVoiceLanguage();
    const balance = eatenCal - targetCal;
    const isUnder = balance <= 0;

    const prompt = `Sei ${activeVoice.name} (${activeVoice.styleTag}), con personalità: ${activeVoice.personality}.
Fai la recensione vocale serale della giornata dell'utente (Daily Voice Recap).
Dati:
- Calorie consumate: ${eatenCal} kcal
- Obiettivo: ${targetCal} kcal (${isUnder ? 'nel budget, ottimo' : `in eccesso di ${balance} kcal`})
- Calorie bruciate con attività: ${burnedCal} kcal
- Pasti registrati: ${mealsCount}
REGOLE:
1. Stile iconico, energico e spassoso (${activeVoice.cadence}), massimo 20-25 parole.
2. Ironizza con leggerezza, senza giudizi sul corpo, colpa o suggerimenti di compensare il cibo con esercizio.
${spokenTextRules(activeVoice.id, language)}`;

    const generated = await this.callGeminiQuick(prompt);
    if (generated) return generated;
    if (language !== 'it' || isNeapolitanVoice(activeVoice.id)) {
      return coachFallback('recap', language, activeVoice.id, { calories: eatenCal, target: targetCal });
    }

    if (activeVoice.id === 'chef_sarcastico') {
      return isUnder
        ? `Resoconto serale!... Hai assunto ${eatenCal} calorie su ${targetCal}... Buona disciplina, ma non montarti la testa!`
        : `Sveglia!... ${eatenCal} calorie registrate, hai sforato il budget di ${balance} calorie!... Domani zero scuse in cucina!`;
    }
    if (activeVoice.id === 'diva_ironica') {
      return isUnder
        ? `Recap chic tesoro!... ${eatenCal} calorie su ${targetCal}... silhouette perfetta e stile impeccabile!`
        : `Darling attenzione!... ${eatenCal} calorie oggi, un piccolo eccesso mondano... Domani purifichiamo con eleganza!`;
    }
    if (activeVoice.id === 'roastmaster') {
      return isUnder
        ? `Recap della sera!... ${eatenCal} calorie su ${targetCal}... Bravo, hai resistito alle abbuffate!`
        : `Ma che combini!... ${eatenCal} calorie secche, hai sforato di brutto!... Domani se corre al parco!`;
    }
    if (activeVoice.id === 'if_sara') {
      return isUnder
        ? `Recap del giorno bestie!... ${eatenCal} calorie su ${targetCal}... Oggi hai servito pura disciplina!`
        : `Bestie allarme rosso!... ${eatenCal} calorie oggi, abbiamo sgarbato un pochino... Ma domani si torna in track!`;
    }

    if (isUnder) {
      return `Resoconto serale completato!... Hai assunto ${eatenCal} calorie su ${targetCal}. Disciplina impeccabile oggi!`;
    } else {
      return `Attenzione al resoconto serale!... ${eatenCal} calorie registrate, con un piccolo extra. Domani si recupera alla grande!`;
    }
  }

  // ==========================================
  // FEATURE 5: Audio Celebrazione del Record
  // ==========================================
  public async getStreakCelebration(
    streakDays: number,
    voice?: ModelVoiceItem
  ): Promise<string> {
    const activeVoice = voice || (await this.getPreferredCoachVoice());
    const language = await getVoiceLanguage();

    const prompt = `Sei ${activeVoice.name} (${activeVoice.styleTag}), personalità: ${activeVoice.personality}.
Celebra con entusiasmo travolgente l'utente che ha raggiunto uno streak di ${streakDays} GIORNI CONSECUTIVI di tracking su MealPulse!
REGOLE:
1. Tripudio di gioia, motivazione e rispetto per la costanza.
2. Stile e cadenza ${activeVoice.cadence}.
3. Massimo 18-22 parole, con punteggiatura naturale.
${spokenTextRules(activeVoice.id, language)}`;

    const generated = await this.callGeminiQuick(prompt);
    if (generated) return generated;
    if (language !== 'it' || isNeapolitanVoice(activeVoice.id)) {
      return coachFallback('streak', language, activeVoice.id, { days: streakDays });
    }

    if (activeVoice.id === 'chef_sarcastico') {
      return `Incredibile, ${streakDays} giorni di streak!... Finalmente un po' di serietà e disciplina degna di una brigata!`;
    }
    if (activeVoice.id === 'diva_ironica') {
      return `Favoloso darling!... ${streakDays} giorni di streak consecutivo!... Sei una stella assoluta della costanza!`;
    }
    if (activeVoice.id === 'roastmaster') {
      return `Daje tutta!... ${streakDays} giorni di fila senza sgarrare!... Chi l'avrebbe mai detto, sei un treno!`;
    }
    if (activeVoice.id === 'if_sara') {
      return `Omg bestie!... ${streakDays} giorni consecutivi di tracking!... Sei letteralmente un'ispirazione!`;
    }

    return `Incredibile record!... ${streakDays} giorni consecutivi di pura costanza! Sei ufficialmente inarrestabile!`;
  }

  private async callGeminiQuick(prompt: string): Promise<string | null> {
    const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
    const apiKey = envKey && envKey !== 'YOUR_GEMINI_API_KEY' ? envKey : '';
    if (!apiKey) return null;

    const urls = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
    ];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 70 },
          }),
        });

        clearTimeout(tid);
        if (!res.ok) continue;

        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (raw) {
          const clean = raw
            .replace(/\*[^*]+\*/g, '')
            .replace(/\([^)]+\)/g, '')
            .replace(/^["«\s]+/, '')
            .replace(/["»\s]+$/, '')
            .trim();
          if (clean.length > 5) return cleanSpokenText(clean);
        }
      } catch {}
    }
    return null;
  }
}

export const voiceCoachService = new VoiceCoachService();
