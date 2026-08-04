import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface BeautifulAlertProps {
  visible: boolean;
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export const BeautifulAlertModal: React.FC<BeautifulAlertProps> = ({
  visible,
  type = 'success',
  title,
  message,
  buttonText = 'Awesome!',
  onClose,
}) => {
  const getBadgeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'trophy',
          iconColor: '#0F172A',
          bgColor: '#BEF264',
          borderColor: '#BEF264',
        };
      case 'error':
        return {
          icon: 'close-circle',
          iconColor: '#FFFFFF',
          bgColor: '#EF4444',
          borderColor: '#EF4444',
        };
      case 'warning':
        return {
          icon: 'warning',
          iconColor: '#0F172A',
          bgColor: '#F59E0B',
          borderColor: '#F59E0B',
        };
      default:
        return {
          icon: 'sparkles',
          iconColor: '#0F172A',
          bgColor: '#38BDF8',
          borderColor: '#38BDF8',
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.alertCard}>
          <View style={[styles.badgeCircle, { backgroundColor: badge.bgColor }]}>
            <Ionicons name={badge.icon as any} size={36} color={badge.iconColor} />
          </View>

          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.messageText}>{message}</Text>

          <TouchableOpacity style={styles.actionBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.actionBtnText}>{buttonText}</Text>
            <Ionicons name="arrow-forward" size={16} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(190, 242, 100, 0.3)',
    shadowColor: '#BEF264',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  badgeCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 13.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  actionBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});
