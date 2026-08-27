import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

interface PhotoChoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
}

export const PhotoChoiceModal: React.FC<PhotoChoiceModalProps> = ({
  visible,
  onClose,
  onTakePhoto,
  onChooseGallery,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF' }]}>
              {/* Header Icon & Title */}
              <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? '#231816' : '#FFF0ED' }]}>
                <Ionicons name="camera" size={28} color="#FF6B4A" />
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>{t('ai_photo_scan_title')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('choose_photo_method')}
              </Text>

              {/* Options */}
              <View style={styles.optionsContainer}>
                {/* Take Photo */}
                <TouchableOpacity
                  style={[
                    styles.optionBtn,
                    { backgroundColor: isDarkMode ? '#1D2E24' : '#F4FAF4', borderColor: '#C8E6C9' },
                  ]}
                  onPress={() => {
                    onClose();
                    onTakePhoto();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIconBox, { backgroundColor: '#FF6B4A' }]}>
                    <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.optionTextBox}>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{t('take_photo')}</Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{t('take_photo_desc')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                {/* Choose from Gallery */}
                <TouchableOpacity
                  style={[
                    styles.optionBtn,
                    { backgroundColor: isDarkMode ? '#1D2E24' : '#F4FAF4', borderColor: '#C8E6C9' },
                  ]}
                  onPress={() => {
                    onClose();
                    onChooseGallery();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIconBox, { backgroundColor: '#4CAF50' }]}>
                    <Ionicons name="images-outline" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.optionTextBox}>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{t('choose_gallery')}</Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{t('choose_gallery_desc')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: isDarkMode ? '#1F2A23' : '#F1F5F9' }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextBox: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
