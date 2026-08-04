import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { BeautifulAlertModal, BeautifulAlertProps } from '@/components/BeautifulAlertModal';

interface SpinWheelModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SpinWheelModal: React.FC<SpinWheelModalProps> = ({ visible, onClose }) => {
  const { subscribe } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(598); // 09:58

  const [alertConfig, setAlertConfig] = useState<BeautifulAlertProps>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    buttonText: 'Awesome!',
    onClose: () => {},
  });

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 598));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  const formatDigits = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return {
      days: '00',
      hours: '00',
      mins: mins.toString().padStart(2, '0'),
      secs: secs.toString().padStart(2, '0'),
    };
  };

  const digits = formatDigits(timeLeft);

  const handleClaimJackpot = async () => {
    try {
      setLoading(true);
      const success = await subscribe('jackpot');
      if (success) {
        setAlertConfig({
          visible: true,
          type: 'success',
          title: '🎉 80% OFF Discount Claimed!',
          message: 'Il tuo abbonamento MealPulse PRO a 2,99 €/mese è attivo! Tutti i servizi AI sono sbloccati!',
          buttonText: 'Inizia subito',
          onClose: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            onClose();
          },
        });
      } else {
        console.log('[SpinWheelModal] Jackpot claim cancelled or unverified.');
      }
    } catch {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Errore di Pagamento',
        message: 'Impossibile completare la transazione. Riprova più tardi.',
        buttonText: 'OK',
        onClose: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Background Confetti Decorative Dots */}
        <View style={styles.confettiContainer} pointerEvents="none">
          <View style={[styles.dot, { top: 40, left: 40, backgroundColor: '#38BDF8', width: 12, height: 12 }]} />
          <View style={[styles.dot, { top: 80, right: 50, backgroundColor: '#F59E0B', width: 14, height: 14 }]} />
          <View style={[styles.dot, { top: 120, left: 100, backgroundColor: '#10B981', width: 10, height: 10 }]} />
          <View style={[styles.dot, { top: 160, right: 90, backgroundColor: '#F43F5E', width: 16, height: 16 }]} />
          <View style={[styles.dot, { top: 220, left: 60, backgroundColor: '#BEF264', width: 14, height: 14 }]} />
          <View style={[styles.dot, { top: 280, right: 40, backgroundColor: '#38BDF8', width: 10, height: 10 }]} />
        </View>

        {/* Top Bar with Close Button */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={28} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Gift Box Graphic */}
        <View style={styles.giftHeroSection}>
          <View style={styles.giftBoxIconBg}>
            <Text style={{ fontSize: 72 }}>🎁</Text>
            <View style={styles.mascotBadge}>
              <Text style={{ fontSize: 32 }}>🦖</Text>
            </View>
          </View>
        </View>

        {/* Header Text */}
        <Text style={styles.title}>Congratulazioni!</Text>
        <Text style={styles.subtitle}>
          Hai sbloccato l'80% di sconto! Non perdere questa occasione.
        </Text>

        {/* Special Offer Card Box */}
        <View style={styles.offerCard}>
          {/* Orange Ribbon Discount Badge */}
          <View style={styles.ribbonBadge}>
            <Text style={styles.ribbonBadgeText}>-80%</Text>
          </View>

          <Text style={styles.offerCardTitle}>Offerta limitata</Text>

          {/* Countdown Timer Grid */}
          <View style={styles.timerRow}>
            <View style={styles.timerBox}>
              <Text style={styles.timerNum}>{digits.days}</Text>
              <Text style={styles.timerLabel}>giorni</Text>
            </View>
            <View style={styles.timerBox}>
              <Text style={styles.timerNum}>{digits.hours}</Text>
              <Text style={styles.timerLabel}>h</Text>
            </View>
            <View style={styles.timerBox}>
              <Text style={styles.timerNum}>{digits.mins}</Text>
              <Text style={styles.timerLabel}>min</Text>
            </View>
            <View style={styles.timerBox}>
              <Text style={styles.timerNum}>{digits.secs}</Text>
              <Text style={styles.timerLabel}>sec</Text>
            </View>
          </View>

          {/* Dark Price Pill */}
          <View style={styles.pricePill}>
            <Text style={styles.priceMainText}>2,99 € <Text style={styles.priceSubText}>/mese</Text></Text>
            <Text style={styles.priceSubDetail}>Fatturato annualmente a 35,88 €</Text>
          </View>
        </View>

        {/* Bottom Full-Width Action Button */}
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleClaimJackpot}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueBtnText}>Continua</Text>
          )}
        </TouchableOpacity>

        <BeautifulAlertModal {...alertConfig} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  dot: {
    position: 'absolute',
    borderRadius: 8,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    zIndex: 10,
  },
  closeBtn: {
    padding: 6,
  },
  giftHeroSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  giftBoxIconBg: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mascotBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FEF9C3',
    borderRadius: 24,
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  offerCard: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    marginVertical: 20,
    overflow: 'hidden',
  },
  ribbonBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#EA580C',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomRightRadius: 16,
  },
  ribbonBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  offerCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 16,
  },
  timerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  timerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 60,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timerNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  timerLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pricePill: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
  },
  priceMainText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  priceSubText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  priceSubDetail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  continueBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 18,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
