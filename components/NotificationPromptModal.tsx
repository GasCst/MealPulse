import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_PROMPT_KEY = '@mealpulse_notif_prompt_v1';

export const NotificationPromptModal: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const alreadyAsked = await AsyncStorage.getItem(NOTIF_PROMPT_KEY);
      if (alreadyAsked) return;

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        // Show notification prompt on initial app load
        setTimeout(() => setVisible(true), 1200);
      }
    } catch (e) {
      console.warn('[NotifPrompt] Permission check error', e);
    }
  };

  const handleActivate = async () => {
    try {
      await AsyncStorage.setItem(NOTIF_PROMPT_KEY, 'true');
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        console.log('[NotifPrompt] Notification permissions granted!');
      }
    } catch (e) {
      console.warn('[NotifPrompt] Request error', e);
    } finally {
      setVisible(false);
    }
  };

  const handleLater = async () => {
    await AsyncStorage.setItem(NOTIF_PROMPT_KEY, 'true');
    setVisible(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleLater}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Bell Icon Hero */}
          <View style={styles.bellContainer}>
            <View style={styles.bellRipple} />
            <Ionicons name="notifications" size={72} color="#FACC15" />
          </View>

          {/* Main Message */}
          <Text style={styles.message}>
            Gli utenti che attivano le notifiche raggiungono più rapidamente i loro obiettivi!
          </Text>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.laterBtn} onPress={handleLater} activeOpacity={0.8}>
              <Text style={styles.laterBtnText}>Più tardi</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.activateBtn} onPress={handleActivate} activeOpacity={0.85}>
              <Text style={styles.activateBtnText}>Attiva</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
    flex: 1,
  },
  bellContainer: {
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellRipple: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FEF9C3',
    opacity: 0.6,
  },
  message: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 30,
    paddingHorizontal: 16,
    marginVertical: 40,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  laterBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  laterBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  activateBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  activateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
