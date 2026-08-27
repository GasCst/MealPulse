import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { useLanguage } from '@/context/LanguageContext';

interface ScanViewfinderOverlayProps {
  isScanning: boolean;
  onClose?: () => void;
}

export const ScanViewfinderOverlay: React.FC<ScanViewfinderOverlayProps> = ({ isScanning, onClose }) => {
  const { t } = useLanguage();
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isScanning) {
      opacity.value = withTiming(1, { duration: 250 });
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [isScanning]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedBoundingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const animatedSpinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!isScanning) return null;

  return (
    <Animated.View style={[styles.overlayContainer, animatedContainerStyle]}>
      {/* Top Close Button */}
      {onClose && (
        <TouchableOpacity style={styles.topCloseBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Centered Bounding Box */}
      <Animated.View style={[styles.viewfinderBox, animatedBoundingStyle]}>
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
      </Animated.View>

      {/* Bottom Popup Card: Scanning in progress */}
      <View style={styles.bottomCard}>
        <Animated.View style={animatedSpinnerStyle}>
          <Svg width={36} height={36}>
            <Circle cx={18} cy={18} r={14} stroke="#E2E8F0" strokeWidth={3.5} fill="transparent" />
            <Circle
              cx={18}
              cy={18}
              r={14}
              stroke="#FF6B4A"
              strokeWidth={3.5}
              strokeDasharray={90}
              strokeDashoffset={25}
              strokeLinecap="round"
              fill="transparent"
            />
          </Svg>
        </Animated.View>
        <Text style={styles.scanningText}>{t('scanning_in_progress')}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 10,
  },
  topCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  viewfinderBox: {
    width: 220,
    height: 220,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
    borderWidth: 3.5,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  scanningText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
});
