import { Pressable } from '@/components/ui/FeedbackPressable';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

interface QuickActionFabProps {
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

interface ActionTileProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  index: number;
  progress: SharedValue<number>;
  backgroundColor: string;
  textColor: string;
  onPress: () => void;
}

function ActionTile({ label, icon, tint, index, progress, backgroundColor, textColor, onPress }: ActionTileProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const reveal = interpolate(progress.value, [0.13 + index * 0.09, 0.62 + index * 0.07], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: reveal,
      transform: [{ translateY: (1 - reveal) * 18 }, { scale: 0.95 + reveal * 0.05 }],
    };
  });

  return (
    <Animated.View style={[styles.actionSlot, animatedStyle]}>
      <Pressable
        style={[styles.actionTile, { backgroundColor }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={[styles.actionIcon, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={21} color="#FFFFFF" />
        </View>
        <Text style={[styles.actionLabel, { color: textColor }]} numberOfLines={1}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export const QuickActionFab: React.FC<QuickActionFabProps> = ({
  onAddFood,
  onAddWater,
  onQuickScan,
  onOpenDiario,
  onLongPress,
  colors,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [measuredBottom, setMeasuredBottom] = useState<number | null>(null);
  const animationProgress = useSharedValue(0);
  const buttonRef = useRef<View>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosing = useRef(false);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (isOpen) {
      animationProgress.value = 0;
      animationProgress.value = withSpring(1, { damping: 20, stiffness: 240, overshootClamping: true });
    }
  }, [isOpen, animationProgress]);

  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(type === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
  };

  const measureAnchor = () => {
    buttonRef.current?.measureInWindow((_x, y, _width, height) => {
      if (height > 0) setMeasuredBottom(Dimensions.get('window').height - (y + height));
    });
  };

  const openExpander = () => {
    if (isOpen) return;
    triggerHaptic('medium');
    isClosing.current = false;
    measureAnchor();
    setIsOpen(true);
  };

  const closeExpander = (callback?: () => void) => {
    if (isClosing.current) return;
    isClosing.current = true;
    triggerHaptic();
    animationProgress.value = withTiming(0, { duration: 210 });
    closeTimer.current = setTimeout(() => {
      setIsOpen(false);
      isClosing.current = false;
      closeTimer.current = null;
      callback?.();
    }, 220);
  };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: animationProgress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animationProgress.value, [0, 0.5, 1], [0, 0.8, 1]),
    transform: [
      { translateY: interpolate(animationProgress.value, [0, 1], [38, 0]) },
      { scale: interpolate(animationProgress.value, [0, 1], [0.94, 1]) },
    ],
  }));
  const centerButtonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(animationProgress.value, [0, 1], [0, 45])}deg` }],
  }));

  const fallbackOffset = Platform.OS === 'ios' ? insets.bottom + 8 : 16;
  const bottomOffset = measuredBottom !== null && measuredBottom > 0 ? measuredBottom : fallbackOffset;

  return (
    <>
      <View style={styles.tabBarAnchor}>
        <Pressable
          ref={buttonRef}
          onLayout={measureAnchor}
          style={[styles.floatingCenterBtn, { backgroundColor: colors.lime, opacity: isOpen ? 0 : 1 }]}
          onPress={openExpander}
          onLongPress={onLongPress}
          accessibilityRole="button"
          accessibilityLabel={t('fab_open')}
        >
          <Ionicons name="add" size={32} color="#0F172A" />
        </Pressable>
      </View>

      <Modal visible={isOpen} transparent animationType="none" onRequestClose={() => closeExpander()}>
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeExpander()} accessibilityLabel={t('fab_close')} />
          </Animated.View>

          <Animated.View
            style={[
              styles.actionPanel,
              { bottom: bottomOffset + 92, backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder },
              panelStyle,
            ]}
          >
            <View style={styles.panelHeader}>
              <View style={[styles.headerAccent, { backgroundColor: colors.lime }]} />
              <Text style={[styles.panelTitle, { color: themeColors.textPrimary }]}>{t('fab_quick_actions')}</Text>
            </View>
            <View style={styles.actionGrid}>
              <ActionTile label={t('fab_food')} icon="restaurant" tint={colors.coral || '#FF6B4A'} index={0} progress={animationProgress} backgroundColor={themeColors.inputBg} textColor={themeColors.textPrimary} onPress={() => closeExpander(onAddFood)} />
              <ActionTile label={t('fab_water')} icon="water" tint={colors.sky || '#0284C7'} index={1} progress={animationProgress} backgroundColor={themeColors.inputBg} textColor={themeColors.textPrimary} onPress={() => closeExpander(onAddWater)} />
              <ActionTile label={t('fab_scan')} icon="camera" tint={colors.purple || '#8B5CF6'} index={2} progress={animationProgress} backgroundColor={themeColors.inputBg} textColor={themeColors.textPrimary} onPress={() => closeExpander(onQuickScan)} />
              <ActionTile label={t('fab_diary')} icon="book" tint="#10B981" index={3} progress={animationProgress} backgroundColor={themeColors.inputBg} textColor={themeColors.textPrimary} onPress={() => closeExpander(onOpenDiario)} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.modalFabWrap, { bottom: bottomOffset }, centerButtonStyle]}>
            <Pressable
              style={[styles.floatingCenterBtn, { backgroundColor: colors.lime, marginBottom: 0 }]}
              onPress={() => closeExpander()}
              accessibilityRole="button"
              accessibilityLabel={t('fab_close')}
            >
              <Ionicons name="add" size={32} color="#0F172A" />
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  tabBarAnchor: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  modalRoot: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.48)' },
  actionPanel: {
    position: 'absolute',
    left: 18,
    right: 18,
    borderRadius: 24,
    padding: 17,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 12,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  headerAccent: { width: 7, height: 22, borderRadius: 4 },
  panelTitle: { fontSize: 17, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionSlot: { width: '48%', flexGrow: 1 },
  actionTile: {
    minHeight: 72,
    borderRadius: 16,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '800', flexShrink: 1 },
  modalFabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
