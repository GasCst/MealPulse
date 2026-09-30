import { useEffect, useState } from 'react';
import { buttonSoundService } from '@/services/buttonSoundService';

export function useButtonSounds() {
  const [enabled, setEnabled] = useState(buttonSoundService.getEnabled());
  useEffect(() => buttonSoundService.subscribe(setEnabled), []);
  return { enabled, setEnabled: (value: boolean) => buttonSoundService.setEnabled(value) };
}
