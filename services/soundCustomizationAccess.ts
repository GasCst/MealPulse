import { SOUND_THEMES, type ButtonSoundPreferences, type ButtonSoundKind, type SoundChoice, type SoundThemeId } from '@/constants/buttonSounds';

export type SoundChange = { type: 'theme'; theme: SoundThemeId } | { type: 'action'; kind: ButtonSoundKind; choice?: SoundChoice };

// Every non-default change needs its own earned reward. Preview and resetting are free.
export function soundChangeNeedsReward(change: SoundChange, preferences: ButtonSoundPreferences, isPro: boolean): boolean {
  if (isPro) return false;
  if (change.type === 'theme') return change.theme !== 'classic';
  const selected = change.choice ?? SOUND_THEMES.find(theme => theme.id === preferences.theme)!.cues[change.kind];
  return selected !== change.kind;
}

export interface SoundRewardAd {
  addAdEventListener(event: string, callback: () => void): () => void;
  load(): void;
  show(): Promise<void> | void;
}

// No fail-open: errors, skipped ads, web and missing SDKs cannot authorize a change.
export function earnSoundChangeReward(
  ad: SoundRewardAd,
  events: { loaded: string; earned: string; closed: string; error: string },
  signal: AbortSignal,
  onStatus: (status: 'loading' | 'showing') => void,
  timeoutMs = 15000,
): Promise<boolean> {
  return new Promise(resolve => {
    if (signal.aborted) { resolve(false); return; }
    let earned = false;
    let shown = false;
    let finished = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const listeners: (() => void)[] = [];
    const finish = (unlocked: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', aborted);
      listeners.forEach(unsubscribe => unsubscribe());
      resolve(unlocked);
    };
    const aborted = () => finish(false);
    signal.addEventListener('abort', aborted, { once: true });
    try {
      listeners.push(ad.addAdEventListener(events.loaded, () => {
        if (finished || shown) return;
        shown = true;
        clearTimeout(timeout);
        onStatus('showing');
        try { void Promise.resolve(ad.show()).catch(() => finish(false)); }
        catch { finish(false); }
      }));
      listeners.push(ad.addAdEventListener(events.earned, () => { if (shown && !finished) earned = true; }));
      listeners.push(ad.addAdEventListener(events.closed, () => finish(shown && earned)));
      listeners.push(ad.addAdEventListener(events.error, () => finish(false)));
      timeout = setTimeout(() => finish(false), timeoutMs);
      onStatus('loading');
      ad.load();
    } catch { finish(false); }
  });
}
