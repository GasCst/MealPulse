import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

interface DeleteConfirmModalProps {
  visible: boolean;
  title?: string;
  itemName?: string;
  message?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  title,
  itemName,
  message,
  onClose,
  onConfirm,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();

  if (!visible) return null;

  const handleConfirm = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {}
    onConfirm();
  };

  const handleClose = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
    onClose();
  };

  const modalTitle = title || (language === 'it' ? 'Elimina Alimento' : 'Delete Food');
  const defaultMsg = language === 'it'
    ? 'Sei sicuro di voler eliminare questo elemento? L\'azione non può essere annullata.'
    : 'Are you sure you want to delete this item? This action cannot be undone.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.dismissOverlay}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF',
              borderColor: isDarkMode ? '#243A2E' : '#E2E8F0',
            },
          ]}
        >
          {/* Top Warning Badge */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
              },
            ]}
          >
            <Ionicons name="trash-outline" size={28} color="#EF4444" />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {modalTitle}
          </Text>

          {/* Item Name Highlight Pill */}
          {itemName ? (
            <View
              style={[
                styles.itemPill,
                {
                  backgroundColor: isDarkMode ? '#1C2E24' : '#F1F5F9',
                  borderColor: isDarkMode ? '#2B4637' : '#E2E8F0',
                },
              ]}
            >
              <Text
                style={[styles.itemNameText, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                "{itemName}"
              </Text>
            </View>
          ) : null}

          {/* Message / Description */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {message || defaultMsg}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: isDarkMode ? '#203328' : '#F1F5F9',
                  borderColor: isDarkMode ? '#2E493B' : '#E2E8F0',
                },
              ]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>
                {t('cancel', 'Annulla')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Ionicons name="trash" size={18} color="#FFFFFF" />
              <Text style={styles.deleteBtnText}>
                {t('delete', 'Elimina')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  itemPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 8,
    maxWidth: '95%',
  },
  itemNameText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
