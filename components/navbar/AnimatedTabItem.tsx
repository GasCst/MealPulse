import React from 'react';
import { StyleSheet, Pressable, Text, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface AnimatedTabItemProps {
  label: string;
  focusedIcon: keyof typeof Ionicons.glyphMap;
  outlineIcon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
}

export const AnimatedTabItem: React.FC<AnimatedTabItemProps> = ({
  label,
  focusedIcon,
  outlineIcon,
  focused,
  onPress,
  activeColor,
  inactiveColor,
}) => {
  const isPressed = useSharedValue(0);

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    // Dynamic scale: 1.18x when focused, with tactile 0.92x depression on press
    const targetScale = focused ? 1.18 : 1.0;
    const pressScale = isPressed.value ? 0.92 : targetScale;

    return {
      transform: [
        {
          scale: withSpring(pressScale, {
            damping: 12,
            stiffness: 220,
          }),
        },
        {
          translateY: withSpring(focused ? -2 : 0, {
            damping: 15,
          }),
        },
      ],
    };
  });

  return (
    <Pressable
      style={styles.tabButton}
      onPress={() => {
        triggerHaptic();
        onPress();
      }}
      onPressIn={() => {
        isPressed.value = 1;
      }}
      onPressOut={() => {
        isPressed.value = 0;
      }}
    >
      <Animated.View style={[styles.iconWrapper, animatedContainerStyle]}>
        <Ionicons
          name={focused ? focusedIcon : outlineIcon}
          size={22}
          color={focused ? activeColor : inactiveColor}
        />
      </Animated.View>
      <Text
        style={[
          styles.label,
          {
            color: focused ? activeColor : inactiveColor,
            fontWeight: focused ? '800' : '600',
          },
        ]}
      >
        {label}
      </Text>
      {focused && (
        <Animated.View
          style={[styles.activeDot, { backgroundColor: activeColor }]}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
