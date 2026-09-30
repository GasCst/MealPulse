import { useCallback, useEffect, useRef, useState } from 'react';
import { voiceCoachService, type VoicePlaybackScope } from '@/services/voiceCoachService';

export function useVoiceAction(scope: VoicePlaybackScope) {
  const [playback, setPlayback] = useState({ playing: false, loading: false });
  const [preparing, setPreparing] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = voiceCoachService.subscribePlaybackState((playing, loading, _voice, activeScope) => {
      setPlayback({ playing: activeScope === scope && playing, loading: activeScope === scope && loading });
    });
    return () => { mounted.current = false; unsubscribe(); };
  }, [scope]);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    // Also catches a second tap before React has rerendered the disabled button.
    if (pending.current) return;
    pending.current = true;
    setPreparing(true);
    try { await action(); }
    finally {
      pending.current = false;
      if (mounted.current) setPreparing(false);
    }
  }, []);

  return { isPlaying: playback.playing, isLoading: preparing || playback.loading, run };
}
