import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

const SOUND_PREFERENCE_KEY = '@mealpulse_button_sounds';

// Static requires let Metro bundle every local sound for offline playback.
export const BUTTON_SOUNDS = {
  tap: { asset: require('@/assets/sounds/soft-pop.wav'), volume: 0.28 },
  navigate: { asset: require('@/assets/sounds/navigate.wav'), volume: 0.22 },
  open: { asset: require('@/assets/sounds/open.wav'), volume: 0.27 },
  close: { asset: require('@/assets/sounds/close.wav'), volume: 0.22 },
  select: { asset: require('@/assets/sounds/select.wav'), volume: 0.20 },
  increment: { asset: require('@/assets/sounds/increment.wav'), volume: 0.17 },
  decrement: { asset: require('@/assets/sounds/decrement.wav'), volume: 0.17 },
  confirm: { asset: require('@/assets/sounds/confirm.wav'), volume: 0.40 },
  complete: { asset: require('@/assets/sounds/complete.wav'), volume: 0.42 },
  delete: { asset: require('@/assets/sounds/delete.wav'), volume: 0.30 },
  scan: { asset: require('@/assets/sounds/scan.wav'), volume: 0.32 },
  voice: { asset: require('@/assets/sounds/voice.wav'), volume: 0.30 },
  reward: { asset: require('@/assets/sounds/reward.wav'), volume: 0.34 },
  primary: { asset: require('@/assets/sounds/primary.wav'), volume: 0.35 },
  'toggle-on': { asset: require('@/assets/sounds/toggle-on.wav'), volume: 0.22 },
  'toggle-off': { asset: require('@/assets/sounds/toggle-off.wav'), volume: 0.20 },
} as const;

export type ButtonSoundKind = keyof typeof BUTTON_SOUNDS;

// This pool only controls UI sounds; it never stops TTS or changes its audio mode.
class ButtonSoundService {
  private sounds = new Map<ButtonSoundKind, Audio.Sound>();
  private initializing: Promise<void> | null = null;
  private enabled = true;
  private preferenceLoaded = false;
  private preferenceRevision = 0;
  private lastTap = 0;
  private generation = 0;
  private pressSequence = 0;
  private activeSound: Audio.Sound | null = null;
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
    if (this.sounds.size === Object.keys(BUTTON_SOUNDS).length && this.preferenceLoaded) return Promise.resolve();
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
      if (!this.enabled) return;
      const kinds = Object.keys(BUTTON_SOUNDS) as ButtonSoundKind[];
      // Limit simultaneous native player creation during startup.
      for (let start = 0; start < kinds.length; start += 4) {
        if (generation !== this.generation || !this.enabled) return;
        await Promise.all(kinds.slice(start, start + 4).map(async kind => {
          if (this.sounds.has(kind)) return;
          try {
            const { asset, volume } = BUTTON_SOUNDS[kind];
            const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false, volume });
            if (generation !== this.generation) await sound.unloadAsync().catch(() => {});
            else this.sounds.set(kind, sound);
          } catch {
            // A missing sound must never delay or prevent the button action.
          }
        }));
      }
    })().finally(() => { if (this.initializing === initializing) this.initializing = null; });
    this.initializing = initializing;
    return initializing;
  }

  play(kind: ButtonSoundKind = 'tap'): void {
    if (!this.enabled || Date.now() - this.lastTap < 65) return;
    this.lastTap = Date.now();
    const sequence = ++this.pressSequence;
    const generation = this.generation;
    const playLoaded = () => {
      if (!this.enabled || sequence !== this.pressSequence || generation !== this.generation) return;
      const sound = this.sounds.get(kind);
      if (!sound) return;
      // Rapid presses replace the previous UI cue instead of stacking chimes.
      if (this.activeSound && this.activeSound !== sound) void this.activeSound.stopAsync().catch(() => {});
      this.activeSound = sound;
      void sound.replayAsync({ volume: BUTTON_SOUNDS[kind].volume }).catch(() => {});
    };
    if (this.sounds.has(kind)) playLoaded();
    else void this.initialize().then(playLoaded).catch(() => {});
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    this.preferenceRevision++;
    this.preferenceLoaded = true;
    this.listeners.forEach(listener => listener(enabled));
    const saved = AsyncStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled)).catch(() => {});
    if (!enabled) {
      this.pressSequence++;
      this.activeSound = null;
      await Promise.all([...this.sounds.values()].map(sound => sound.stopAsync().catch(() => {})));
    }
    await saved;
    if (enabled && this.enabled) await this.initialize();
  }

  async release(): Promise<void> {
    this.generation++;
    this.pressSequence++;
    this.initializing = null;
    this.activeSound = null;
    const sounds = [...this.sounds.values()];
    this.sounds.clear();
    await Promise.all(sounds.map(sound => sound.unloadAsync().catch(() => {})));
  }
}

export const buttonSoundService = new ButtonSoundService();
