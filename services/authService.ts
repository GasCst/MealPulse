import { supabase } from '@/services/supabaseService';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export class AuthService {
  /**
   * Signs up user with email & password in Supabase Cloud DB
   */
  static async signUpWithEmail(email: string, pass: string) {
    console.log(`[Auth Step 1] Initiating Email SignUp for: ${email}`);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
      });

      if (error) {
        console.error('[Auth Step 2 ERROR] Email SignUp Failed:', error.message);
        throw error;
      }
      console.log(`[Auth Step 2 SUCCESS] User registered successfully with ID: ${data.user?.id}`);
      return { user: data.user, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || 'Registration failed' };
    }
  }

  /**
   * Signs in user with email & password from Supabase Cloud DB
   */
  static async signInWithEmail(email: string, pass: string) {
    console.log(`[Auth Step 1] Initiating Email SignIn for: ${email}`);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        console.error('[Auth Step 2 ERROR] Email SignIn Failed:', error.message);
        throw error;
      }
      console.log(`[Auth Step 2 SUCCESS] User signed in successfully with ID: ${data.user?.id}`);
      return { user: data.user, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || 'Login failed' };
    }
  }

  /**
   * Signs in user anonymously in Supabase Cloud DB so Guest has a persistent user_id
   */
  static async signInAnonymously() {
    console.log('[Auth Step 1] Initiating Anonymous Guest Sign-In...');
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.warn('[Auth Anonymous Notice]:', error.message);
        return { user: null, error: error.message };
      }
      console.log(`[Auth Anonymous SUCCESS] Anonymous user session active with ID: ${data.user?.id}`);
      return { user: data.user, error: null };
    } catch (err: any) {
      console.warn('[Auth Anonymous Exception]:', err.message);
      return { user: null, error: err.message };
    }
  }

  /**
   * Real Google OAuth Sign-In via Supabase Auth & WebBrowser with full debug logging
   */
  static async signInWithGoogle() {
    console.log('====================================================');
    console.log('[Auth Step 1] Initiating Google OAuth Sign-In...');

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const webRedirect = `${window.location.origin}/auth/callback`;
        console.log(`[Auth Web] Initiating Web OAuth with redirect: ${webRedirect}`);
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: webRedirect,
            queryParams: {
              prompt: 'select_account',
            },
          },
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, error: null };
      }

      const redirectUrl = Linking.createURL('auth/callback');
      console.log(`[Auth Step 2] Generated OAuth Redirect URI: ${redirectUrl}`);

      console.log('[Auth Step 3] Requesting Google OAuth URL from Supabase...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        console.error('[Auth Step 3 ERROR] Supabase OAuth URL generation failed:', error.message);
        return {
          success: false,
          error: error.message.includes('provider is not enabled')
            ? 'Google Provider is not enabled in your Supabase Dashboard. Please enable Google in Supabase -> Auth -> Providers -> Google.'
            : error.message,
        };
      }

      console.log(`[Auth Step 4] Supabase returned OAuth Authorization URL: ${data?.url ? data.url.substring(0, 70) + '...' : 'NULL'}`);

      if (data?.url) {
        console.log('[Auth Step 5] Launching WebBrowser auth session...');
        console.log(`[Auth Step 5] Full OAuth Browser URL: ${data.url}`);

        try {
          const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
            showInRecents: true,
          });

          console.log('[Auth Step 6] WebBrowser session result:', JSON.stringify(res));

          if (res.type === 'success' && res.url) {
            console.log(`[Auth Step 7] Callback URL received from browser: ${res.url}`);

            const extractToken = (url: string, param: string) => {
              const match = url.match(new RegExp(`[?&#]${param}=([^&]+)`));
              return match ? decodeURIComponent(match[1]) : null;
            };

            const accessToken = extractToken(res.url, 'access_token');
            const refreshToken = extractToken(res.url, 'refresh_token');

            if (accessToken && refreshToken) {
              console.log('[Auth Step 8] Establishing Supabase session from tokens...');
              const { error: sessionErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (sessionErr) {
                console.error('[Auth Step 8 Error]', sessionErr.message);
                return { success: false, error: sessionErr.message };
              }
              console.log('[Auth Step 9 SUCCESS] Session set successfully!');
              return { success: true, error: null };
            }
          }
        } catch (e: any) {
          console.warn('[Auth Fallback] Launching system browser...', e.message);
          await WebBrowser.openBrowserAsync(data.url);
          return { success: false, pendingDeepLink: true, error: null };
        }
      }

      return { success: true, error: null };
    } catch (err: any) {
      console.error('[Auth ERROR Catch]', err);
      return { success: false, error: err.message || 'Google Sign-In failed' };
    }
  }

  /**
   * Signs out current user from cloud session
   */
  static async signOut() {
    console.log('[Auth SignOut] Signing out user from Supabase session...');
    try {
      await supabase.auth.signOut();
      return true;
    } catch (e: any) {
      console.warn('[Auth SignOut Error]', e.message);
      return false;
    }
  }

  /**
   * Gets current logged in cloud user session
   */
  static async getCurrentUser() {
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  }
}
