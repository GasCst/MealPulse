import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface VoiceFeatureAdModalProps {
  visible: boolean;
  featureTitle: string;
  featureDescription?: string;
  onClose: () => void;
  onUnlocked: () => void;
  onGoPro?: () => void;
}

// The web preview cannot load the native AdMob SDK. Keep the same flow visible
// while making it clear that the rewarded ad itself only runs in the mobile app.
export const VoiceFeatureAdModal: React.FC<VoiceFeatureAdModalProps> = ({
  visible,
  featureTitle,
  featureDescription,
  onClose,
  onUnlocked,
  onGoPro,
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[styles.badge, { color: colors.lime }]}>FUNZIONALITÀ PRO</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{featureTitle}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {featureDescription || 'Ascolta questa funzione con MealPulse PRO o con un annuncio nella app mobile.'}
          </Text>
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            Anteprima web: gli annunci video sono disponibili solo nella app mobile.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.lime }]}
            onPress={() => {
              onClose();
              onUnlocked();
            }}
          >
            <Text style={styles.primaryButtonText}>Prova la funzione</Text>
          </TouchableOpacity>
          {onGoPro && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                onClose();
                onGoPro();
              }}
            >
              <Text style={{ color: colors.textPrimary }}>Scopri PRO</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={{ color: colors.textSecondary }}>Chiudi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 380, borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center' },
  badge: { fontSize: 11, fontWeight: '800', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  description: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 12 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 20 },
  primaryButton: { width: '100%', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  secondaryButton: { paddingVertical: 12 },
});
