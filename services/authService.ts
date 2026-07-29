import { supabase } from '@/services/supabaseService';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

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
   * Real Google OAuth Sign-In via Supabase Auth & WebBrowser with full debug logging
   */
  static async signInWithGoogle() {
    console.log('====================================================');
    console.log('[Auth Step 1] Initiating Google OAuth Sign-In...');

    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'mealpulse',
        path: 'auth/callback',
      });
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
        throw error;
      }

      console.log(`[Auth Step 4] Supabase returned OAuth Authorization URL: ${data?.url ? data.url.substring(0, 70) + '...' : 'NULL'}`);

      if (data?.url) {
        console.log('[Auth Step 5] Launching WebBrowser auth session...');
        console.log(`[Auth Step 5] Browser URL: ${data.url}`);

        // Try openAuthSessionAsync first, fallback to openBrowserAsync for Expo Go on Android
        try {
          const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
            showInRecents: true,
          });

          console.log('[Auth Step 6] WebBrowser session resolved:', JSON.stringify(res));

          if (res.type === 'success' && res.url) {
            console.log(`[Auth Step 7] Callback URL received from browser: ${res.url}`);

            const urlStr = res.url.replace('#', '?');
            const urlObj = new URL(urlStr);
            const accessToken = urlObj.searchParams.get('access_token');
            const refreshToken = urlObj.searchParams.get('refresh_token');

            if (accessToken && refreshToken) {
              console.log('[Auth Step 9] Setting Supabase session tokens...');
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              return { success: true, error: null };
            }
          }
        } catch (e: any) {
          console.warn('[Auth Step 5 Fallback] Opening system browser window directly...', e.message);
          await WebBrowser.openBrowserAsync(data.url);
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
