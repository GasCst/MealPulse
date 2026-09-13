import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase, ExpoGoSafeAsyncStorage } from './supabaseService';

const TTS_URL_STORAGE_KEY = '@mealpulse_remote_tts_url';

let inMemoryTtsUrl: string | null = null;
let isPrefetching = false;

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

  // 2. Se non forziamo il refresh e abbiamo la cache in RAM, usiamola
  if (!forceRefresh && inMemoryTtsUrl) {
    return inMemoryTtsUrl;
  }

  // 3. Controlla la cache persistente locale per risposta immediata senza lag
  if (!forceRefresh) {
    try {
      const cached = await ExpoGoSafeAsyncStorage.getItem(TTS_URL_STORAGE_KEY);
      if (cached && typeof cached === 'string' && cached.startsWith('http')) {
        inMemoryTtsUrl = cached.replace(/\/+$/, '');
        // Esegui sincronizzazione di background silenziosa da Supabase
        prefetchRemoteConfig().catch(() => {});
        return inMemoryTtsUrl;
      }
    } catch {}
  }

  // 4. Scarica da Supabase Cloud DB (app_config) con timeout di sicurezza di 2500ms
  try {
    const remoteUrl = await fetchFromSupabase();
    if (remoteUrl) {
      inMemoryTtsUrl = remoteUrl;
      await ExpoGoSafeAsyncStorage.setItem(TTS_URL_STORAGE_KEY, remoteUrl).catch(() => {});
      return remoteUrl;
    }
  } catch (err) {
    console.warn('[RemoteConfig] Supabase fetch error, fallback to local:', err);
  }

  // 5. Fallback se Supabase non risponde o dispositivo offline
  return getLocalFallbackUrl();
}

/**
 * Interroga la tabella 'app_config' su Supabase per la chiave 'tts_api_url'
 */
async function fetchFromSupabase(): Promise<string | null> {
  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

  const queryPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'tts_api_url')
        .maybeSingle();

      if (!error && data?.value && typeof data.value === 'string' && data.value.trim().length > 0) {
        return data.value.trim().replace(/\/+$/, '');
      }
    } catch (e) {
      console.warn('[RemoteConfig] Query exception:', e);
    }
    return null;
  })();

  return Promise.race([queryPromise, timeoutPromise]);
}

/**
 * Precarica e sincronizza in background la configurazione remota all'avvio dell'app
 */
export async function prefetchRemoteConfig(): Promise<void> {
  if (isPrefetching) return;
  isPrefetching = true;
  try {
    const remoteUrl = await fetchFromSupabase();
    if (remoteUrl) {
      inMemoryTtsUrl = remoteUrl;
      await ExpoGoSafeAsyncStorage.setItem(TTS_URL_STORAGE_KEY, remoteUrl).catch(() => {});
      console.log('[RemoteConfig] Synced TTS URL from Supabase:', remoteUrl);
    }
  } catch (err) {
    console.warn('[RemoteConfig] Prefetch failed:', err);
  } finally {
    isPrefetching = false;
  }
}

/**
 * Consente l'aggiornamento dinamico dell'endpoint TTS su Supabase
 */
export async function updateRemoteTtsApiUrl(newUrl: string): Promise<boolean> {
  const cleanUrl = newUrl.trim().replace(/\/+$/, '');
  try {
    const { error } = await supabase
      .from('app_config')
      .upsert({
        key: 'tts_api_url',
        value: cleanUrl,
        updated_at: new Date().toISOString(),
      });

    if (!error) {
      inMemoryTtsUrl = cleanUrl;
      await ExpoGoSafeAsyncStorage.setItem(TTS_URL_STORAGE_KEY, cleanUrl).catch(() => {});
      return true;
    }
  } catch (e) {
    console.error('[RemoteConfig] Update error:', e);
  }
  return false;
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
