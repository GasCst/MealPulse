import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { SupabaseService } from '@/services/supabaseService';
import { BeautifulAlertModal, BeautifulAlertProps } from '@/components/BeautifulAlertModal';

interface SpinWheelModalProps {
  visible: boolean;
  onClose: () => void;
}

// 8 Wheel Segments configuration matching exact layout & color tokens
const SECTORS = [
  { start: 0, end: 45, mid: 22.5, color: '#12161A', label: '15% OFF', textColor: '#F5F4EE' },
  { start: 45, end: 90, mid: 67.5, color: '#C8F31D', label: 'TRY AGAIN', textColor: '#12161A' },
  { start: 90, end: 135, mid: 112.5, color: '#FF6A45', label: '20% OFF', textColor: '#12161A' },
  { start: 135, end: 180, mid: 157.5, color: '#3A8DFF', label: '25% OFF', textColor: '#F5F4EE' },
  { start: 180, end: 225, mid: 202.5, color: '#12161A', label: 'TRY AGAIN', textColor: '#F5F4EE' },
  { start: 225, end: 270, mid: 247.5, color: '#9CC400', label: '30% OFF', textColor: '#12161A' },
  { start: 270, end: 315, mid: 292.5, color: '#FFD23F', label: '80% OFF 🎉', textColor: '#12161A' },
  { start: 315, end: 360, mid: 337.5, color: '#FF6A45', label: '10% OFF', textColor: '#F5F4EE' },
];

export const SpinWheelModal: React.FC<SpinWheelModalProps> = ({ visible, onClose }) => {
  const { subscribe, user } = useSubscription();
  const { t } = useLanguage();

  const [triesLeft, setTriesLeft] = useState<number>(2);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [showLoseResult, setShowLoseResult] = useState<boolean>(false);
  const [showWinResult, setShowWinResult] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;

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
    setTriesLeft(2);
    setIsSpinning(false);
    setShowLoseResult(false);
    setShowWinResult(false);
    spinAnim.setValue(0);
  }, [visible]);

  /**
   * DESIGN INTENT: Scripted Two-Stage Marketing Discount Reveal.
   * First spin (triesLeft = 2) is scripted to land on "TRY AGAIN" (67.5°).
   * Second spin (triesLeft = 1) is scripted to land on "80% OFF 🎉" (292.5°).
   * This creates high engagement while guaranteeing the promotional Jackpot offer.
   */
  const handleSpinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowLoseResult(false);

    const currentTries = triesLeft;

    Animated.timing(spinAnim, {
      toValue: currentTries === 2 ? 1 : 2,
      duration: 3600,
      easing: Easing.bezier(0.18, 0.86, 0.1, 1),
      useNativeDriver: true,
    }).start(async () => {
      setIsSpinning(false);
      if (currentTries === 2) {
        setTriesLeft(1);
        setShowLoseResult(true);
        if (user?.id) {
          await SupabaseService.savePromoEvent(user.id, { eventType: 'spin_wheel', outcome: 'try_again' });
        }
      } else {
        setTriesLeft(0);
        setShowWinResult(true);
        if (user?.id) {
          await SupabaseService.savePromoEvent(user.id, { eventType: 'spin_wheel', outcome: 'jackpot_80_percent', discountPercent: 80 });
        }
      }
    });
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '1732.5deg', '3307.5deg'], // 1732.5° lands on TRY AGAIN (67.5°), 3307.5° lands on 80% OFF (292.5°)
  });

  const handleClaimJackpot = async () => {
    try {
      setLoading(true);
      const success = await subscribe('jackpot');
      if (success) {
        if (user?.id) {
          await SupabaseService.savePromoEvent(user.id, { eventType: 'spin_wheel', outcome: 'jackpot_claimed', discountPercent: 80, claimed: true });
        }
        setAlertConfig({
          visible: true,
          type: 'success',
          title: '🎉 80% OFF Discount Claimed!',
          message: 'MealPulse PRO (2,99 €/month) is active! All AI features are unlocked!',
          buttonText: 'Get Started',
          onClose: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            onClose();
          },
        });
      }
    } catch {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Payment Error',
        message: 'Could not complete transaction. Please try again.',
        buttonText: 'OK',
        onClose: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to draw SVG pie wedge
  const getSectorPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  };

  // Helper to place text label inside wedge
  const getLabelCoords = (cx: number, cy: number, r: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    return { x, y };
  };

  const wheelSize = 254;
  const center = wheelSize / 2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Confetti Background Accents */}
          <View style={[styles.confetti, { width: 8, height: 8, backgroundColor: '#3A8DFF', top: 14, left: 20 }]} />
          <View style={[styles.confetti, { width: 10, height: 10, backgroundColor: '#FFD23F', top: 40, right: 70 }]} />
          <View style={[styles.confetti, { width: 7, height: 7, backgroundColor: '#FF6A45', top: 90, right: 30 }]} />
          <View style={[styles.confetti, { width: 6, height: 6, backgroundColor: '#9CC400', top: 60, left: 60 }]} />

          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color="#4B5259" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
            {/* Tries Badge */}
            <View style={styles.badgeRow}>
              <View style={styles.triesBadge}>
                <Text style={styles.triesBadgeText}>
                  {triesLeft === 2 ? '2 TRIES LEFT' : triesLeft === 1 ? '1 TRY LEFT' : '0 TRIES LEFT'}
                </Text>
              </View>
            </View>

            {/* Header Titles */}
            <Text style={styles.title}>{t('spin_wheel_title')}</Text>
            <Text style={styles.sub}>{t('spin_wheel_sub')}</Text>

            {/* Wheel Zone */}
            <View style={styles.wheelZone}>
              {/* Pointer Arrow */}
              <View style={styles.pointer}>
                <View style={styles.pointerDot} />
              </View>

              {/* Dark Ring Frame */}
              <View style={styles.ring}>
                {/* Animated Rotating Wheel */}
                <Animated.View style={[styles.wheel, { transform: [{ rotate: spinInterpolate }] }]}>
                  <Svg width={wheelSize} height={wheelSize} viewBox={`0 0 ${wheelSize} ${wheelSize}`}>
                    <G>
                      {SECTORS.map((sec, idx) => {
                        const path = getSectorPath(center, center, center, sec.start, sec.end);
                        const { x, y } = getLabelCoords(center, center, center * 0.62, sec.mid);
                        return (
                          <G key={idx}>
                            <Path d={path} fill={sec.color} />
                            <SvgText
                              x={x}
                              y={y}
                              fill={sec.textColor}
                              fontSize={sec.label.includes('80%') ? "11" : "12"}
                              fontWeight="bold"
                              textAnchor="middle"
                              alignmentBaseline="middle"
                              transform={`rotate(${sec.mid}, ${x}, ${y})`}
                            >
                              {sec.label}
                            </SvgText>
                          </G>
                        );
                      })}
                    </G>
                  </Svg>
                </Animated.View>
              </View>

              {/* Center Hub */}
              <View style={styles.hub}>
                <Text style={{ fontSize: 22 }}>🎡</Text>
              </View>
            </View>

            {/* Spin Button */}
            {!showWinResult && (
              <TouchableOpacity
                style={[styles.spinBtn, isSpinning && styles.disabledSpinBtn]}
                onPress={handleSpinWheel}
                disabled={isSpinning}
                activeOpacity={0.85}
              >
                <Text style={styles.spinBtnText}>
                  {isSpinning
                    ? 'SPINNING... 🎡'
                    : triesLeft === 2
                    ? 'SPIN THE WHEEL 🎡'
                    : 'SPIN AGAIN FOR 80% OFF 🚀'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Tries Progress Dots */}
            {!showWinResult && (
              <View style={styles.dotsRow}>
                <View style={[styles.dot, triesLeft >= 1 && styles.dotFilled]} />
                <View style={[styles.dot, triesLeft >= 2 && styles.dotFilled]} />
              </View>
            )}

            {/* Lose Result Box (Spin 1) */}
            {showLoseResult && (
              <View style={styles.resultLose}>
                <Text style={styles.loseTitle}>So close! 😩</Text>
                <Text style={styles.loseSub}>
                  {"You landed on Try Again — good news, you've got one more spin."}
                </Text>
              </View>
            )}

            {/* Win Result Box (Spin 2 Jackpot) */}
            {showWinResult && (
              <View style={styles.resultWin}>
                <Text style={styles.winTitle}>🎉 JACKPOT! 80% OFF unlocked</Text>
                <Text style={styles.winSub}>
                  Your discount is reserved for the next 10 minutes.
                </Text>
                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={handleClaimJackpot}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#12161A" />
                  ) : (
                    <Text style={styles.claimBtnText}>Claim 80% OFF Now</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>

        <BeautifulAlertModal {...alertConfig} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 18, 20, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    position: 'relative',
    backgroundColor: '#F5F4EE',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 390,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    borderRadius: 50,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EDEBE0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  triesBadge: {
    backgroundColor: '#12161A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  triesBadgeText: {
    color: '#C8F31D',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#14181B',
    textAlign: 'center',
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: '#6B7169',
    textAlign: 'center',
    marginBottom: 20,
  },
  wheelZone: {
    position: 'relative',
    width: 270,
    height: 270,
    alignSelf: 'center',
    marginBottom: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointer: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -13,
    zIndex: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderLeftColor: 'transparent',
    borderRightWidth: 13,
    borderRightColor: 'transparent',
    borderTopWidth: 22,
    borderTopColor: '#12161A',
  },
  pointerDot: {
    position: 'absolute',
    top: -24,
    left: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6A45',
    borderWidth: 3,
    borderColor: '#F5F4EE',
  },
  ring: {
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: '#12161A',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
  },
  wheel: {
    width: 254,
    height: 254,
    borderRadius: 127,
    overflow: 'hidden',
  },
  hub: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 58,
    height: 58,
    marginTop: -29,
    marginLeft: -29,
    borderRadius: 29,
    backgroundColor: '#F5F4EE',
    borderWidth: 4,
    borderColor: '#12161A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  spinBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#C8F31D',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#C8F31D',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
  },
  disabledSpinBtn: {
    opacity: 0.5,
  },
  spinBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#12161A',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DAD8CC',
  },
  dotFilled: {
    backgroundColor: '#12161A',
  },
  resultLose: {
    marginTop: 18,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F0EFE7',
  },
  loseTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#14181B',
    marginBottom: 4,
  },
  loseSub: {
    fontSize: 12.5,
    color: '#6B7169',
    textAlign: 'center',
  },
  resultWin: {
    marginTop: 18,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#12161A',
    width: '100%',
  },
  winTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#C8F31D',
    marginBottom: 4,
    textAlign: 'center',
  },
  winSub: {
    fontSize: 12.5,
    color: '#C7CBC2',
    textAlign: 'center',
  },
  claimBtn: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#C8F31D',
    alignItems: 'center',
  },
  claimBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#12161A',
  },
});
