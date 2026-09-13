import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Pressable,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RadialFabExpanderProps {
  onAddFood: () => void;
  onAddWater: () => void;
  onQuickScan: () => void;
  onOpenDiario?: () => void;
  onLongPress?: () => void;
  colors: {
    lime: string;
    coral?: string;
    sky?: string;
    purple?: string;
  };
}

export const RadialFabExpander: React.FC<RadialFabExpanderProps> = ({
  onAddFood,
  onAddWater,
  onQuickScan,
  onOpenDiario,
  onLongPress,
  colors,
}) => {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const animationProgress = useSharedValue(0);

  const anchorRef = useRef<View>(null);
  const [measuredBottom, setMeasuredBottom] = useState<number | null>(null);

  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(
          type === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
        );
      }
    } catch {}
  };

  const measureAnchor = () => {
    anchorRef.current?.measureInWindow((_x, y, _width, height) => {
      if (height > 0) {
        const windowHeight = Dimensions.get('window').height;
        const bottom = windowHeight - (y + height);
        setMeasuredBottom(bottom);
      }
    });
  };

  const openExpander = () => {
    triggerHaptic('medium');
    measureAnchor();
    setIsOpen(true);
  };

  useEffect(() => {
    if (isOpen) {
      animationProgress.value = 0;
      animationProgress.value = withSpring(1, {
        damping: 14,
        stiffness: 220,
      });
    }
  }, [isOpen]);

  const closeExpander = (callback?: () => void) => {
    triggerHaptic('light');
    animationProgress.value = withTiming(0, { duration: 160 });
    setTimeout(() => {
      setIsOpen(false);
      if (callback) callback();
    }, 170);
  };

  // Center 'X' button: smoothly spins into place and lands perfectly upright at 0deg
  const centerBtnStyle = useAnimatedStyle(() => {
    const rotate = interpolate(animationProgress.value, [0, 1], [-90, 0]);
    const scale = interpolate(animationProgress.value, [0, 0.5, 1], [0.92, 1.08, 1]);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  // Option 1: Food (top-left: -85px, -38px)
  const foodBtnStyle = useAnimatedStyle(() => {
    const tx = interpolate(animationProgress.value, [0, 1], [0, -85]);
    const ty = interpolate(animationProgress.value, [0, 1], [0, -38]);
    const scale = interpolate(animationProgress.value, [0, 0.6, 1], [0, 1.15, 1]);
    const opacity = interpolate(animationProgress.value, [0, 0.2, 1], [0, 0.8, 1]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale }],
      opacity,
    };
  });

  // Option 2: Water (top-center-left: -30px, -85px)
  const waterBtnStyle = useAnimatedStyle(() => {
    const tx = interpolate(animationProgress.value, [0, 1], [0, -30]);
    const ty = interpolate(animationProgress.value, [0, 1], [0, -85]);
    const scale = interpolate(animationProgress.value, [0, 0.6, 1], [0, 1.15, 1]);
    const opacity = interpolate(animationProgress.value, [0, 0.2, 1], [0, 0.8, 1]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale }],
      opacity,
    };
  });

  // Option 3: Quick AI Scan (top-center-right: +30px, -85px)
  const scanBtnStyle = useAnimatedStyle(() => {
    const tx = interpolate(animationProgress.value, [0, 1], [0, 30]);
    const ty = interpolate(animationProgress.value, [0, 1], [0, -85]);
    const scale = interpolate(animationProgress.value, [0, 0.6, 1], [0, 1.15, 1]);
    const opacity = interpolate(animationProgress.value, [0, 0.2, 1], [0, 0.8, 1]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale }],
      opacity,
    };
  });

  // Option 4: Diario Pasti (top-right: +85px, -38px)
  const diarioBtnStyle = useAnimatedStyle(() => {
    const tx = interpolate(animationProgress.value, [0, 1], [0, 85]);
    const ty = interpolate(animationProgress.value, [0, 1], [0, -38]);
    const scale = interpolate(animationProgress.value, [0, 0.6, 1], [0, 1.15, 1]);
    const opacity = interpolate(animationProgress.value, [0, 0.2, 1], [0, 0.8, 1]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale }],
      opacity,
    };
  });

  // Backdrop overlay that captures taps outside
  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animationProgress.value, [0, 1], [0, 1]),
    };
  });

  // Fallback offset if measureInWindow is not yet fired
  const fallbackOffset = Platform.OS === 'ios' ? insets.bottom + 18 : 28;
  const bottomOffset = measuredBottom !== null && measuredBottom > 0 ? measuredBottom : fallbackOffset;

  return (
    <>
      {/* Standby button in Tab Bar (Column 3, perfectly centered) */}
      <View
        ref={anchorRef}
        collapsable={false}
        onLayout={measureAnchor}
        style={styles.tabBarAnchor}
      >
        <TouchableOpacity
          style={[
            styles.floatingCenterBtn,
            { backgroundColor: colors.lime, opacity: isOpen ? 0 : 1 },
          ]}
          onPress={openExpander}
          onLongPress={onLongPress}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={32} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Expanded State Overlay Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => closeExpander()}
      >
        <View style={styles.modalRoot}>
          {/* Backdrop */}
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeExpander()} />
          </Animated.View>

          {/* Radial Arc Pop-out Action Buttons */}
          <View
            style={[styles.modalAnchorContainer, { bottom: bottomOffset }]}
            pointerEvents="box-none"
          >
            {/* Option 1: Food / Meal */}
            <Animated.View style={[styles.radialOption, foodBtnStyle]}>
              <TouchableOpacity
                style={[styles.actionCircle, { backgroundColor: colors.coral || '#FF6B4A' }]}
                onPress={() => closeExpander(onAddFood)}
                activeOpacity={0.85}
              >
                <Ionicons name="restaurant" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.optionMiniLabel}>Cibo</Text>
            </Animated.View>

            {/* Option 2: Water */}
            <Animated.View style={[styles.radialOption, waterBtnStyle]}>
              <TouchableOpacity
                style={[styles.actionCircle, { backgroundColor: colors.sky || '#0284C7' }]}
                onPress={() => closeExpander(onAddWater)}
                activeOpacity={0.85}
              >
                <Ionicons name="water" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.optionMiniLabel}>Acqua</Text>
            </Animated.View>

            {/* Option 3: Quick AI Scan */}
            <Animated.View style={[styles.radialOption, scanBtnStyle]}>
              <TouchableOpacity
                style={[styles.actionCircle, { backgroundColor: colors.purple || '#8B5CF6' }]}
                onPress={() => closeExpander(onQuickScan)}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.optionMiniLabel}>Scansione</Text>
            </Animated.View>

            {/* Option 4: Diario Pasti */}
            <Animated.View style={[styles.radialOption, diarioBtnStyle]}>
              <TouchableOpacity
                style={[styles.actionCircle, { backgroundColor: '#10B981' }]}
                onPress={() => closeExpander(onOpenDiario)}
                activeOpacity={0.85}
              >
                <Ionicons name="book" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.optionMiniLabel}>Diario</Text>
            </Animated.View>

            {/* Central 'X' Button in Modal: Perfectly centered and straight */}
            <Animated.View style={[styles.centerBtnWrapper, centerBtnStyle]}>
              <TouchableOpacity
                style={[styles.floatingCenterBtn, styles.modalCloseBtn]}
                onPress={() => closeExpander()}
                activeOpacity={0.9}
              >
                <Ionicons
                  name="close"
                  size={30}
                  color="#FFFFFF"
                  style={styles.closeIcon}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  tabBarAnchor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCenterBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  modalCloseBtn: {
    backgroundColor: '#1E293B',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  centerBtnWrapper: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  closeIcon: {
    textAlign: 'center',
    alignSelf: 'center',
    includeFontPadding: false,
  },
  modalRoot: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  modalAnchorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialOption: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  optionMiniLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
