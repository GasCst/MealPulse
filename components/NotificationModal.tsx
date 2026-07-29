import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

const NOTIFICATIONS = [
  {
    id: '1',
    title: '🍳 Morning Breakfast Reminder',
    time: '08:30 AM',
    body: 'Take 2 seconds to scan your plate & log your protein target.',
    read: false,
    icon: 'camera',
    color: '#84CC16',
  },
  {
    id: '2',
    title: '💧 Afternoon Hydration Check-in',
    time: '02:00 PM',
    body: 'You are 3 glasses away from your 2,500ml water goal today.',
    read: false,
    icon: 'water',
    color: '#0EA5E9',
  },
  {
    id: '3',
    title: '🔥 6-Day Meal Logging Streak!',
    time: 'Yesterday',
    body: 'Awesome job! You hit all 3 daily meal logging targets.',
    read: true,
    icon: 'flame',
    color: '#F97316',
  },
];

export const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications Center</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
            <Text style={styles.badgeCount}>2 New</Text>
          </View>

          {NOTIFICATIONS.map((item) => (
            <View
              key={item.id}
              style={[styles.notifCard, !item.read && styles.unreadCard]}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>

              <View style={styles.notifTextGroup}>
                <View style={styles.notifTitleRow}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
                <Text style={styles.notifBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#84CC16',
    backgroundColor: '#F7FEE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unreadCard: {
    borderColor: '#BEF264',
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifTextGroup: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  notifBody: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },
});
