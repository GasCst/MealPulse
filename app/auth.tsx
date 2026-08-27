import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { AuthService } from '@/services/authService';
import { useTheme } from '@/context/ThemeContext';

export default function AuthScreen() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      triggerHaptic('medium');
      Alert.alert('Required Fields', 'Please enter your email address and password.');
      return;
    }

    triggerHaptic('medium');
    setLoading(true);
    if (isSignUp) {
      const { user, error } = await AuthService.signUpWithEmail(email, password);
      setLoading(false);
      if (error) {
        Alert.alert('Registration Notice', error);
      } else {
        triggerHaptic('success');
        router.replace('/(tabs)');
      }
    } else {
      const { user, error } = await AuthService.signInWithEmail(email, password);
      setLoading(false);
      if (error) {
        Alert.alert('Login Notice', error);
      } else {
        triggerHaptic('success');
        router.replace('/(tabs)');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    triggerHaptic('medium');
    setLoading(true);
    const { success, error } = await AuthService.signInWithGoogle();
    setLoading(false);
    if (success) {
      triggerHaptic('success');
      router.replace('/(tabs)');
    } else if (error) {
      Alert.alert('Google Sign-In Notice', error);
    }
  };

  const handleBack = () => {
    triggerHaptic('light');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.duration(500)} style={styles.heroSection}>
          <View style={[styles.logoCircle, { backgroundColor: colors.limeGlow, borderColor: colors.lime }]}>
            <Ionicons name="flash" size={36} color={colors.lime} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isSignUp ? 'Create Cloud Account' : 'Welcome Back'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isSignUp
              ? 'Sign up to sync your AI meal photo scans & daily macro targets securely to cloud database.'
              : 'Log in to access your nutrition history & PRO subscription.'}
          </Text>
        </Animated.View>

        {/* Social Fast Sign-In Options */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.socialCard}>
          <TouchableOpacity
            style={[styles.googleBtn, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text style={[styles.googleBtnText, { color: colors.textPrimary }]}>Continue with Google</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR WITH EMAIL</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
        </View>

        <Animated.View
          entering={FadeInUp.delay(150).duration(400)}
          style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Email Address</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder },
            ]}
            placeholder="alex@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Password</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder },
            ]}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.lime }]}
            onPress={handleEmailAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>{isSignUp ? 'Create Cloud Account' : 'Log In'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#0F172A" />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
            {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setIsSignUp(!isSignUp);
            }}
          >
            <Text style={[styles.toggleLink, { color: colors.lime }]}>{isSignUp ? 'Log In' : 'Sign Up'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  socialCard: {
    marginBottom: 16,
  },
  googleBtn: {
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    marginBottom: 6,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  toggleText: {
    fontSize: 13,
  },
  toggleLink: {
    fontSize: 13,
    fontWeight: '900',
  },
});
