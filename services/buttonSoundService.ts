import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

const SOUND_PREFERENCE_KEY = '@mealpulse_button_sounds';
const TAP_SOUND = require('@/assets/sounds/soft-pop.wav');
const VOLUME = 0.35;

// One preloaded local sound for the whole app. Never changes the TTS audio mode.
class ButtonSoundService {
  private sound: Audio.Sound | null = null;
  private initializing: Promise<void> | null = null;
  private enabled = true;
  private preferenceLoaded = false;
  private preferenceRevision = 0;
  private lastTap = 0;
  private generation = 0;
  private listeners = new Set<(enabled: boolean) => void>();

  getEnabled() { return this.enabled; }

  subscribe(listener: (enabled: boolean) => void) {
    this.listeners.add(listener);
    listener(this.enabled);
    return () => { this.listeners.delete(listener); };
  }

  initialize(): Promise<void> {
    if (Platform.OS === 'web' && typeof window === 'undefined') return Promise.resolve();
    if (this.initializing) return this.initializing;
    if (this.sound && this.preferenceLoaded) return Promise.resolve();
    const generation = this.generation;
    const preferenceRevision = this.preferenceRevision;
    const initializing = (async () => {
      if (!this.preferenceLoaded) {
        const saved = await AsyncStorage.getItem(SOUND_PREFERENCE_KEY).catch(() => null);
        if (generation !== this.generation) return;
        if (preferenceRevision === this.preferenceRevision) this.enabled = saved !== 'false';
        this.preferenceLoaded = true;
        this.listeners.forEach(listener => listener(this.enabled));
      }
      if (!this.enabled || this.sound) return;
      const { sound } = await Audio.Sound.createAsync(TAP_SOUND, { shouldPlay: false, volume: VOLUME });
      if (generation !== this.generation) {
        await sound.unloadAsync();
      } else {
        this.sound = sound;
      }
    })().catch(() => {
      // Missing audio support must never delay or prevent the button's action.
    }).finally(() => { if (this.initializing === initializing) this.initializing = null; });
    this.initializing = initializing;
    return initializing;
  }

  playTap(): void {
    if (!this.enabled || Date.now() - this.lastTap < 85) return;
    this.lastTap = Date.now();
    if (this.sound) {
      void this.sound.replayAsync({ volume: VOLUME }).catch(() => {});
    } else {
      void this.initialize().then(() => {
        if (this.enabled) void this.sound?.replayAsync({ volume: VOLUME }).catch(() => {});
      });
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    this.preferenceRevision++;
    this.preferenceLoaded = true;
    this.listeners.forEach(listener => listener(enabled));
    await AsyncStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled)).catch(() => {});
    if (enabled) await this.initialize();
    else await this.sound?.stopAsync().catch(() => {});
  }

  async release(): Promise<void> {
    this.generation++;
    this.initializing = null;
    const sound = this.sound;
    this.sound = null;
    await sound?.unloadAsync().catch(() => {});
  }
}

export const buttonSoundService = new ButtonSoundService();
