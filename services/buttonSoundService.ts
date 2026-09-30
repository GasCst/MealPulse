import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { NativeModules, Platform } from 'react-native';

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

type NativeButtonSounds = {
  load(kind: string, resourceName: string): Promise<void>;
  play(kind: string, volume: number): Promise<void>;
  setEnabled(enabled: boolean): void;
  release(): void;
};

type LoadedCue = { backend: 'android' } | { backend: 'expo'; sound: Audio.Sound };

// Android uses short PCM samples. Other runtimes retain isolated Expo players.
// Neither backend changes the shared audio mode or stops the TTS player.
class ButtonSoundService {
  private readonly native: NativeButtonSounds | undefined = Platform.OS === 'android'
    ? NativeModules?.MealPulseButtonSounds : undefined;
  private sounds = new Map<ButtonSoundKind, Audio.Sound>();
  private nativeReady = new Set<ButtonSoundKind>();
  private nativeUnavailable = new Set<ButtonSoundKind>();
  private loads = new Map<ButtonSoundKind, Promise<LoadedCue | null>>();
  private queues = new Map<ButtonSoundKind, Promise<void>>();
  private initializing: Promise<void> | null = null;
  private preferenceTask: Promise<void> | null = null;
  private enabled = true;
  private preferenceLoaded = false;
  private preferenceRevision = 0;
  private generation = 0;
  private playbackEpoch = 0;
  private seenEvents = new WeakSet<object>();
  private warned = new Set<ButtonSoundKind>();
  private listeners = new Set<(enabled: boolean) => void>();

  getEnabled() { return this.enabled; }

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
    const task = AsyncStorage.getItem(SOUND_PREFERENCE_KEY).catch(() => null).then(saved => {
      if (generation !== this.generation) return;
      if (revision === this.preferenceRevision) this.enabled = saved !== 'false';
      this.preferenceLoaded = true;
      this.native?.setEnabled(this.enabled);
      this.listeners.forEach(listener => listener(this.enabled));
    }).finally(() => { if (this.preferenceTask === task) this.preferenceTask = null; });
    this.preferenceTask = task;
    return task;
  }

  private getCue(kind: ButtonSoundKind, generation: number): Promise<LoadedCue | null> {
    if (generation !== this.generation) return Promise.resolve(null);
    const sound = this.sounds.get(kind);
    if (sound) return Promise.resolve({ backend: 'expo', sound });
    if (this.nativeReady.has(kind)) return Promise.resolve({ backend: 'android' });
    const pending = this.loads.get(kind);
    if (pending) return pending;
    const loading = (async (): Promise<LoadedCue | null> => {
      if (this.native && !this.nativeUnavailable.has(kind)) {
        try {
          // Metro's Android raw-resource names omit hyphens.
          const filename = kind === 'tap' ? 'softpop' : kind.replace(/-/g, '');
          await this.native.load(kind, `assets_sounds_${filename}`);
          if (generation !== this.generation) return null;
          this.nativeReady.add(kind);
          return { backend: 'android' };
        } catch {
          if (generation !== this.generation) return null;
          // Expo Go/development builds may not contain packaged raw resources.
          this.nativeUnavailable.add(kind);
        }
      }
      const { asset, volume } = BUTTON_SOUNDS[kind];
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
      const kinds = Object.keys(BUTTON_SOUNDS) as ButtonSoundKind[];
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

  private enqueue(kind: ButtonSoundKind, operation: () => Promise<void>): Promise<void> {
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
    const generation = this.generation;
    const epoch = this.playbackEpoch;
    const allowed = () => this.enabled && generation === this.generation && epoch === this.playbackEpoch;
    // Serialize commands on one player; different categories can finish naturally.
    void this.enqueue(kind, async () => {
      await this.loadPreference();
      if (!allowed()) return;
      for (let attempt = 0; attempt < 2; attempt++) {
        let cue: LoadedCue | null = null;
        try {
          cue = await this.getCue(kind, generation);
          if (!cue || !allowed()) return;
          if (cue.backend === 'android') await this.native!.play(kind, BUTTON_SOUNDS[kind].volume);
          else await cue.sound.replayAsync({ volume: BUTTON_SOUNDS[kind].volume });
          return;
        } catch (error) {
          if (!allowed()) return;
          if (cue?.backend === 'android') {
            this.nativeReady.delete(kind);
            this.nativeUnavailable.add(kind);
          } else if (cue?.backend === 'expo' && this.sounds.get(kind) === cue.sound) {
            this.sounds.delete(kind);
            await cue.sound.unloadAsync().catch(() => {});
          }
          if (attempt === 1 && !this.warned.has(kind)) {
            this.warned.add(kind);
            console.warn('[ButtonSounds] Unable to play cue:', kind, error);
          }
        }
      }
    }).catch(() => {});
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    this.preferenceRevision++;
    this.preferenceLoaded = true;
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
