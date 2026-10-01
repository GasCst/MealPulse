import { useEffect, useState } from 'react';
import { buttonSoundService } from '@/services/buttonSoundService';

export function useButtonSounds() {
  const [enabled, setEnabled] = useState(buttonSoundService.getEnabled());
  const [preferences, setPreferences] = useState(buttonSoundService.getPreferences());
  useEffect(() => buttonSoundService.subscribe(setEnabled), []);
  useEffect(() => buttonSoundService.subscribePreferences(setPreferences), []);
  return { enabled, preferences, setEnabled: (value: boolean) => buttonSoundService.setEnabled(value) };
}
