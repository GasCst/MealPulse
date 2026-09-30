import { TouchableOpacity } from '@/components/ui/FeedbackPressable';
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { ComedyCharacter, ComedyCharacterId } from './AINutritionResultModal';

export const ADMOB_REWARDED_UNIT_ID = 'ca-app-pub-3077938552594114/1449566589';

export interface UnlockableVoice {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  isProOnly?: boolean;
}

interface RoastUnlockModalProps {
  visible: boolean;
  character: UnlockableVoice | ComedyCharacter | null;
  onClose: () => void;
  onUnlocked: (characterId: any) => void;
  onGoPro: () => void;
}

export const RoastUnlockModal: React.FC<RoastUnlockModalProps> = ({
  visible,
  character,
  onClose,
  onUnlocked,
  onGoPro,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [isLoadingAd, setIsLoadingAd] = useState(false);

  const handleWatchAd = () => {
    if (!character) return;
    setIsLoadingAd(true);
    // Simulazione web: sblocco istantaneo dopo breve animazione
    setTimeout(() => {
      setIsLoadingAd(false);
      onUnlocked(character.id);
    }, 800);
  };

  if (!character) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#112217' : '#FFFFFF' }]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} sound="close" onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Character Avatar & Badge */}
          <View style={styles.characterHeader}>
            <View style={[styles.emojiCircle, { backgroundColor: isDarkMode ? '#1B3525' : '#F1F8F3' }]}>
              <Text style={styles.emojiText}>{character.emoji}</Text>
            </View>
            <View style={styles.proBadge}>
              <Ionicons name="sparkles" size={12} color="#FFA726" />
              <Text style={styles.proBadgeText}>PERSONAGGIO PRO</Text>
            </View>
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Sblocca {character.name}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {character.desc}. Ascolta il roast comico esclusivo generato apposta per questo piatto!
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Opzione 1: Passa a PRO */}
            <TouchableOpacity
              style={[styles.proButton, { backgroundColor: colors.coral }]}
              sound="open" onPress={() => {
                onClose();
                onGoPro();
              }}
              activeOpacity={0.85}
            >
              <View style={styles.btnRow}>
                <Ionicons name="star" size={18} color="#FFFFFF" />
                <Text style={styles.proButtonText}>Passa a MealPulse PRO</Text>
              </View>
              <Text style={styles.proSubtext}>Sblocca tutti i personaggi & Zero Ads</Text>
            </TouchableOpacity>

            {/* Opzione 2: Guarda Video (Simulazione Web) */}
            <TouchableOpacity
              style={[
                styles.adButton,
                {
                  backgroundColor: isDarkMode ? '#1A2C22' : '#F4FAF5',
                  borderColor: isDarkMode ? '#2D4B39' : '#E0ECE3',
                },
              ]}
              sound="primary" onPress={handleWatchAd}
              disabled={isLoadingAd}
              activeOpacity={0.8}
            >
              {isLoadingAd ? (
                <ActivityIndicator size="small" color={colors.coral} />
              ) : (
                <>
                  <View style={styles.btnRow}>
                    <Ionicons name="play-circle" size={18} color="#FFA726" />
                    <Text style={[styles.adButtonText, { color: colors.textPrimary }]}>
                      Guarda video per sbloccare
                    </Text>
                  </View>
                  <Text style={[styles.adSubtext, { color: colors.textSecondary }]}>
                    Gratis per questo pasto (Web Preview)
                  </Text>
                </>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  characterHeader: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emojiText: {
    fontSize: 38,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFA726',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  proButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  proSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  adButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  adButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  adSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
