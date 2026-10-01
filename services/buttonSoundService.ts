import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { NativeModules, Platform } from 'react-native';

import {
  BUTTON_SOUNDS, BUTTON_SOUND_KINDS, SOUND_EFFECTS, SOUND_THEMES,
  DEFAULT_SOUND_PREFERENCES, resolveButtonSound, sanitizeSoundPreferences,
  type ButtonSoundKind, type ButtonSoundPreferences, type SoundEffectId, type SoundThemeId, type SoundChoice,
} from '@/constants/buttonSounds';

export { BUTTON_SOUNDS, type ButtonSoundKind } from '@/constants/buttonSounds';
const SOUND_PREFERENCE_KEY = '@mealpulse_button_sounds';
const CUSTOMIZATION_KEY = '@mealpulse_button_sound_customization_v1';

type NativeButtonSounds = {
  load(kind: string, resourceName: string): Promise<void>;
  play(kind: string, volume: number): Promise<void>;
  setEnabled(enabled: boolean): void;
  release(): void;
  unload?(effect: string): void;
};

type LoadedCue = { backend: 'android' } | { backend: 'expo'; sound: Audio.Sound };

// Android uses short PCM samples. Other runtimes retain isolated Expo players.
// Neither backend changes the shared audio mode or stops the TTS player.
class ButtonSoundService {
  private readonly native: NativeButtonSounds | undefined = Platform.OS === 'android'
    ? NativeModules?.MealPulseButtonSounds : undefined;
  private sounds = new Map<SoundEffectId, Audio.Sound>();
  private nativeReady = new Set<SoundEffectId>();
  private nativeUnavailable = new Set<SoundEffectId>();
  private loads = new Map<SoundEffectId, Promise<LoadedCue | null>>();
  private queues = new Map<SoundEffectId, Promise<void>>();
  private initializing: Promise<void> | null = null;
  private preferenceTask: Promise<void> | null = null;
  private enabled = true;
  private preferenceLoaded = false;
  private preferenceRevision = 0;
  private generation = 0;
  private playbackEpoch = 0;
  private seenEvents = new WeakSet<object>();
  private warned = new Set<SoundEffectId>();
  private listeners = new Set<(enabled: boolean) => void>();

  private preferences: ButtonSoundPreferences = DEFAULT_SOUND_PREFERENCES;
  private customizationRevision = 0;
  private preferenceWrites: Promise<void> = Promise.resolve();
  private preferenceListeners = new Set<(preferences: ButtonSoundPreferences) => void>();

  getEnabled() { return this.enabled; }
  getPreferences() { return this.preferences; }

  subscribePreferences(listener: (preferences: ButtonSoundPreferences) => void) {
    this.preferenceListeners.add(listener);
    listener(this.preferences);
    return () => { this.preferenceListeners.delete(listener); };
  }

  subscribe(listener: (enabled: boolean) => void) {
    this.listeners.add(listener);
    listener(this.enabled);
    return () => { this.listeners.delete(listener); };
  }

  private loadPreference(): Promise<void> {
    if (this.preferenceLoaded) return Promise.resolve();
    if (this.preferenceTask) return this.preferenceTask;
    const generation = this.generation;
    const revision = this.preferenceRevision;
    const customizationRevision = this.customizationRevision;
    const task = Promise.all([
      AsyncStorage.getItem(SOUND_PREFERENCE_KEY).catch(() => null),
      AsyncStorage.getItem(CUSTOMIZATION_KEY).catch(() => null),
    ]).then(([saved, customization]) => {
      if (generation !== this.generation) return;
      if (revision === this.preferenceRevision) this.enabled = saved !== 'false';
      if (customizationRevision === this.customizationRevision) {
        try { this.preferences = sanitizeSoundPreferences(customization ? JSON.parse(customization) : null); }
        catch { this.preferences = sanitizeSoundPreferences(null); }
        this.preferenceListeners.forEach(listener => listener(this.preferences));
      }
      this.preferenceLoaded = true;
      this.native?.setEnabled(this.enabled);
      this.listeners.forEach(listener => listener(this.enabled));
    }).finally(() => { if (this.preferenceTask === task) this.preferenceTask = null; });
    this.preferenceTask = task;
    return task;
  }

  private getCue(kind: SoundEffectId, generation: number): Promise<LoadedCue | null> {
    if (generation !== this.generation) return Promise.resolve(null);
    const sound = this.sounds.get(kind);
    if (sound) return Promise.resolve({ backend: 'expo', sound });
    if (this.nativeReady.has(kind)) return Promise.resolve({ backend: 'android' });
    const pending = this.loads.get(kind);
    if (pending) return pending;
    const loading = (async (): Promise<LoadedCue | null> => {
      if (this.native && !this.nativeUnavailable.has(kind)) {
        try {
          await this.native.load(kind, SOUND_EFFECTS[kind].resource);
          if (generation !== this.generation) return null;
          this.nativeReady.add(kind);
          return { backend: 'android' };
        } catch {
          if (generation !== this.generation) return null;
          // Expo Go/development builds may not contain packaged raw resources.
          this.nativeUnavailable.add(kind);
        }
      }
      const { asset } = SOUND_EFFECTS[kind];
      const volume = 0.28;
      const { sound: loaded } = await Audio.Sound.createAsync(asset, { shouldPlay: false, volume });
      if (generation !== this.generation) {
        await loaded.unloadAsync().catch(() => {});
        return null;
      }
      this.sounds.set(kind, loaded);
      return { backend: 'expo', sound: loaded };
    })().finally(() => { if (this.loads.get(kind) === loading) this.loads.delete(kind); });
    this.loads.set(kind, loading);
    return loading;
  }

  initialize(): Promise<void> {
    if (Platform.OS === 'web' && typeof window === 'undefined') return Promise.resolve();
    if (this.initializing) return this.initializing;
    const generation = this.generation;
    const initializing = (async () => {
      await this.loadPreference();
      if (generation !== this.generation || !this.enabled) return;
      const kinds = [...new Set(BUTTON_SOUND_KINDS.map(kind => resolveButtonSound(kind, this.preferences)))].filter(
        (effect): effect is SoundEffectId => effect !== 'silent'
      );
      for (let start = 0; start < kinds.length; start += 4) {
        if (generation !== this.generation || !this.enabled) return;
        await Promise.allSettled(kinds.slice(start, start + 4).map(kind => this.getCue(kind, generation)));
      }
    })().catch(() => {
      // A failed preload can be retried by the next press of that category.
    }).finally(() => { if (this.initializing === initializing) this.initializing = null; });
    this.initializing = initializing;
    return initializing;
  }

  private enqueue(kind: SoundEffectId, operation: () => Promise<void>): Promise<void> {
    const previous = this.queues.get(kind) || Promise.resolve();
    const queued = previous.catch(() => {}).then(operation);
    this.queues.set(kind, queued);
    void queued.finally(() => { if (this.queues.get(kind) === queued) this.queues.delete(kind); }).catch(() => {});
    return queued;
  }

  play(kind: ButtonSoundKind = 'tap', event?: object): void {
    if (!this.enabled) return;
    // Deduplicate only the same bubbled press, never a different rapid touch.
    if (event) {
      const nativeEvent = (event as { nativeEvent?: object }).nativeEvent || event;
      if (this.seenEvents.has(nativeEvent)) return;
      this.seenEvents.add(nativeEvent);
    }
    void this.playResolved(kind).catch(() => {});
  }

  // Preview obeys mute and never saves a preference or consumes an ad unlock.
  preview(effect: SoundEffectId, kind: ButtonSoundKind = 'confirm'): Promise<boolean> {
    return this.playResolved(kind, effect);
  }

  private async playResolved(action: ButtonSoundKind, preview?: SoundEffectId): Promise<boolean> {
    const generation = this.generation;
    const epoch = this.playbackEpoch;
    const allowed = () => this.enabled && generation === this.generation && epoch === this.playbackEpoch;
    await this.loadPreference();
    if (!allowed()) return false;
    const effect = preview ?? resolveButtonSound(action, this.preferences);
    if (effect === 'silent') return false;
    let played = false;
    await this.enqueue(effect, async () => {
      if (!allowed()) return;
      for (let attempt = 0; attempt < 2; attempt++) {
        let cue: LoadedCue | null = null;
        try {
          cue = await this.getCue(effect, generation);
          if (!cue || !allowed()) return;
          // Action importance controls volume even when two categories share a sample.
          const volume = BUTTON_SOUNDS[action].volume;
          if (cue.backend === 'android') await this.native!.play(effect, volume);
          else await cue.sound.replayAsync({ volume });
          played = true;
          return;
        } catch (error) {
          if (!allowed()) return;
          if (cue?.backend === 'android') {
            this.nativeReady.delete(effect);
            this.nativeUnavailable.add(effect);
          } else if (cue?.backend === 'expo' && this.sounds.get(effect) === cue.sound) {
            this.sounds.delete(effect);
            await cue.sound.unloadAsync().catch(() => {});
          }
          if (attempt === 1 && !this.warned.has(effect)) {
            this.warned.add(effect);
            console.warn('[ButtonSounds] Unable to play cue:', effect, error);
          }
        }
      }
    });
    this.trimCache();
    return played;
  }

  private trimCache() {
    // Keep the active palette and recent previews, rather than decoding all 104 files.
    const selected = new Set(BUTTON_SOUND_KINDS.map(kind => resolveButtonSound(kind, this.preferences)));
    for (const effect of new Set([...this.sounds.keys(), ...this.nativeReady])) {
      if (this.sounds.size + this.nativeReady.size <= 24) break;
      if (selected.has(effect) || this.queues.has(effect) || this.loads.has(effect)) continue;
      const sound = this.sounds.get(effect);
      this.sounds.delete(effect);
      if (sound) void sound.unloadAsync().catch(() => {});
      if (this.nativeReady.delete(effect)) this.native?.unload?.(effect);
    }
  }

  private async savePreferences(preferences: ButtonSoundPreferences): Promise<void> {
    const previous = this.preferences;
    this.customizationRevision++;
    this.preferences = preferences;
    this.playbackEpoch++; // A queued old theme cannot play after a new choice.
    this.preferenceListeners.forEach(listener => listener(preferences));
    const value = JSON.stringify(preferences);
    const write = this.preferenceWrites.catch(() => {}).then(() => AsyncStorage.setItem(CUSTOMIZATION_KEY, value));
    this.preferenceWrites = write;
    try { await write; }
    catch (error) {
      if (this.preferences === preferences) {
        this.preferences = previous;
        this.playbackEpoch++;
        this.preferenceListeners.forEach(listener => listener(previous));
      }
      throw error;
    }
    if (this.initializing) await this.initializing;
    await this.initialize();
    this.trimCache();
  }

  async setTheme(theme: SoundThemeId): Promise<void> {
    await this.loadPreference();
    if (!SOUND_THEMES.some(item => item.id === theme)) return;
    await this.savePreferences({ theme, overrides: {} });
  }

  async setOverride(kind: ButtonSoundKind, choice?: SoundChoice): Promise<void> {
    await this.loadPreference();
    const overrides = { ...this.preferences.overrides };
    if (choice === undefined) delete overrides[kind];
    else if (choice === 'silent' || Object.hasOwn(SOUND_EFFECTS, choice)) overrides[kind] = choice;
    else return;
    await this.savePreferences({ ...this.preferences, overrides });
  }

  async setEnabled(enabled: boolean): Promise<void> {
    const preferencesReady = this.loadPreference();
    this.enabled = enabled;
    this.preferenceRevision++;
    this.listeners.forEach(listener => listener(enabled));
    this.native?.setEnabled(enabled);
    const saved = AsyncStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled)).catch(() => {});
    if (!enabled) {
      this.playbackEpoch++;
      await Promise.all([...this.sounds.entries()].map(([kind, sound]) =>
        this.enqueue(kind, async () => { await sound.stopAsync().catch(() => {}); })
      ));
    }
    await saved;
    await preferencesReady;
    if (enabled && this.enabled) await this.initialize();
  }

  async release(): Promise<void> {
    this.generation++;
    this.playbackEpoch++;
    this.initializing = null;
    this.preferenceTask = null;
    this.loads.clear();
    this.queues.clear();
    this.nativeReady.clear();
    this.nativeUnavailable.clear();
    this.warned.clear();
    this.seenEvents = new WeakSet<object>();
    this.native?.release();
    const sounds = [...this.sounds.values()];
    this.sounds.clear();
    await Promise.all(sounds.map(sound => sound.unloadAsync().catch(() => {})));
  }
}

export const buttonSoundService = new ButtonSoundService();
