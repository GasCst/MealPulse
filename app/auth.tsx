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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthService } from '@/services/authService';

export default function AuthScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please enter your email address and password.');
      return;
    }

    setLoading(true);
    if (isSignUp) {
      const { user, error } = await AuthService.signUpWithEmail(email, password);
      setLoading(false);
      if (error) {
        Alert.alert('Registration Notice', error);
      } else {
        router.replace('/(tabs)');
      }
    } else {
      const { user, error } = await AuthService.signInWithEmail(email, password);
      setLoading(false);
      if (error) {
        Alert.alert('Login Notice', error);
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { success, error } = await AuthService.signInWithGoogle();
    setLoading(false);
    if (success) {
      router.replace('/(tabs)');
    } else if (error) {
      Alert.alert('Google Sign-In Notice', error);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="nutrition" size={36} color="#84CC16" />
          </View>
          <Text style={styles.title}>{isSignUp ? 'Create Cloud Account' : 'Welcome Back'}</Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Sign up to sync your AI meal photo scans & daily macro targets securely to cloud database.'
              : 'Log in to access your nutrition history & PRO subscription.'}
          </Text>
        </View>

        {/* Social Fast Sign-In Options */}
        <View style={styles.socialCard}>
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} disabled={loading} activeOpacity={0.85}>
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR WITH EMAIL</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="alex@example.com"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleEmailAuth} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>{isSignUp ? 'Create Cloud Account' : 'Log In'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#0F172A" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}
          </Text>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.toggleLink}>{isSignUp ? 'Log In' : 'Sign Up'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F7FEE7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BEF264',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  socialCard: {
    marginBottom: 16,
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
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
    fontWeight: '700',
    color: '#0F172A',
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
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 6,
  },
  submitBtn: {
    backgroundColor: '#BEF264',
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
    fontWeight: '800',
    color: '#0F172A',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  toggleText: {
    fontSize: 13,
    color: '#64748B',
  },
  toggleLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#84CC16',
  },
});
