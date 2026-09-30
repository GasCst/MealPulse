import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase, ExpoGoSafeAsyncStorage } from './supabaseService';

const TTS_URL_STORAGE_KEY = '@mealpulse_remote_tts_url';

let inMemoryTtsUrl: string | null = null;
let remoteFetch: Promise<string | null> | null = null;

/**
 * Risolve dinamicamente l'endpoint del microservizio TTS:
 * 1. Su Web locale: usa 'http://localhost:8000'
 * 2. Su Mobile / Prod:
 *    - Legge prioritariamente da Supabase ('app_config' -> 'tts_api_url')
 *    - Mantiene una cache locale su AsyncStorage per avvio istantaneo offline
 *    - In caso di assenza di rete, ricorre a EXPO_PUBLIC_TTS_API_URL o IP host locale
 */
export async function getDynamicTtsApiUrl(forceRefresh: boolean = false): Promise<string> {
  // 1. Web Localhost Fast-Path
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }

  // Ogni richiesta controlla Supabase: il Mac può cambiare IP nella stessa sessione.
  try {
    const remoteUrl = await fetchFromSupabase();
    if (remoteUrl) return remoteUrl;
  } catch (err) {
    console.warn('[RemoteConfig] Supabase fetch error, fallback to local:', err);
  }

  // La cache serve soltanto quando la configurazione remota non è raggiungibile.
  if (!forceRefresh) {
    if (inMemoryTtsUrl) return inMemoryTtsUrl;
    try {
      const cached = normalizeTtsUrl(await ExpoGoSafeAsyncStorage.getItem(TTS_URL_STORAGE_KEY));
      if (cached) {
        inMemoryTtsUrl = cached;
        return cached;
      }
    } catch {}
  }
  return getLocalFallbackUrl();
}

function normalizeTtsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s]+$/i.test(clean) ? clean : null;
}

/**
 * Interroga la tabella 'app_config' su Supabase per la chiave 'tts_api_url'
 */
function fetchFromSupabase(): Promise<string | null> {
  if (remoteFetch) return remoteFetch;
  remoteFetch = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'tts_api_url')
        .abortSignal(controller.signal)
        .maybeSingle();

      const remoteUrl = !error ? normalizeTtsUrl(data?.value) : null;
      if (remoteUrl) {
        inMemoryTtsUrl = remoteUrl;
        await ExpoGoSafeAsyncStorage.setItem(TTS_URL_STORAGE_KEY, remoteUrl).catch(() => {});
        return remoteUrl;
      }
    } catch (e) {
      console.warn('[RemoteConfig] Query exception:', e);
    } finally {
      clearTimeout(timer);
    }
    return null;
  })().finally(() => { remoteFetch = null; });
  return remoteFetch;
}

/**
 * Precarica e sincronizza in background la configurazione remota all'avvio dell'app
 */
export async function prefetchRemoteConfig(): Promise<void> {
  try {
    const remoteUrl = await fetchFromSupabase();
    if (remoteUrl) {
      console.log('[RemoteConfig] Synced TTS URL from Supabase:', remoteUrl);
    }
  } catch (err) {
    console.warn('[RemoteConfig] Prefetch failed:', err);
  }
}

/**
 * Fallback locale in caso di assenza totale di rete
 */
function getLocalFallbackUrl(): string {
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
