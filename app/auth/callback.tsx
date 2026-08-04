import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabaseService';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [statusText, setStatusText] = useState('Completing Google Sign In...');

  useEffect(() => {
    handleCallback();
  }, [url]);

  const handleCallback = async () => {
    try {
      const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
      console.log('[Auth Callback Screen] Processing URL:', currentUrl);

      if (currentUrl.includes('access_token') || currentUrl.includes('refresh_token')) {
        const extractToken = (u: string, param: string) => {
          const match = u.match(new RegExp(`[?&#]${param}=([^&]+)`));
          return match ? decodeURIComponent(match[1]) : null;
        };

        const accessToken = extractToken(currentUrl, 'access_token');
        const refreshToken = extractToken(currentUrl, 'refresh_token');

        if (accessToken && refreshToken) {
          setStatusText('Establishing Secure Session...');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error) {
            console.log('[Auth Callback] Google OAuth Login Success!');
            router.replace('/(tabs)');
            return;
          }
        }
      }

      // Check if session already exists
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        router.replace('/(tabs)');
      } else {
        setTimeout(() => {
          router.replace('/auth' as any);
        }, 1500);
      }
    } catch (e: any) {
      console.warn('[Auth Callback Error]', e.message);
      router.replace('/auth' as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#BEF264" style={styles.spinner} />
        <Text style={styles.titleText}>Signing In with Google</Text>
        <Text style={styles.subText}>{statusText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    maxWidth: 340,
  },
  spinner: {
    marginBottom: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  subText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
