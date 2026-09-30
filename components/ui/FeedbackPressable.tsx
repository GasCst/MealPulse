import React, { forwardRef, useCallback } from 'react';
import {
  Pressable as NativePressable,
  TouchableOpacity as NativeTouchableOpacity,
  TouchableHighlight as NativeTouchableHighlight,
  TouchableWithoutFeedback as NativeTouchableWithoutFeedback,
  Switch as NativeSwitch,
} from 'react-native';
import { buttonSoundService, type ButtonSoundKind } from '@/services/buttonSoundService';

type SoundPreference = { sound?: boolean | ButtonSoundKind };

// Keep native props and forwarded refs intact for navigation and animations.
export const TouchableOpacity = forwardRef<
  React.ElementRef<typeof NativeTouchableOpacity>,
  React.ComponentProps<typeof NativeTouchableOpacity> & SoundPreference
>(({ onPress, disabled, sound = true, ...props }, ref) => {
  const handlePress = useCallback<NonNullable<typeof onPress>>((event) => {
    if (disabled) return;
    if (sound) buttonSoundService.play(sound === true ? 'tap' : sound, event);
    onPress?.(event);
  }, [disabled, onPress, sound]);
  return <NativeTouchableOpacity {...props} ref={ref} disabled={disabled} onPress={onPress ? handlePress : undefined} />;
});
TouchableOpacity.displayName = 'FeedbackTouchableOpacity';

export const Pressable = forwardRef<
  React.ElementRef<typeof NativePressable>,
  React.ComponentProps<typeof NativePressable> & SoundPreference
>(({ onPress, disabled, sound = true, ...props }, ref) => {
  const handlePress = useCallback<NonNullable<typeof onPress>>((event) => {
    if (disabled) return;
    if (sound) buttonSoundService.play(sound === true ? 'tap' : sound, event);
    onPress?.(event);
  }, [disabled, onPress, sound]);
  return <NativePressable {...props} ref={ref} disabled={disabled} onPress={onPress ? handlePress : undefined} />;
});
Pressable.displayName = 'FeedbackPressable';

export const TouchableHighlight = forwardRef<
  React.ElementRef<typeof NativeTouchableHighlight>,
  React.ComponentProps<typeof NativeTouchableHighlight> & SoundPreference
>(({ onPress, disabled, sound = true, ...props }, ref) => {
  const handlePress = useCallback<NonNullable<typeof onPress>>((event) => {
    if (disabled) return;
    if (sound) buttonSoundService.play(sound === true ? 'tap' : sound, event);
    onPress?.(event);
  }, [disabled, onPress, sound]);
  return <NativeTouchableHighlight {...props} ref={ref} disabled={disabled} onPress={onPress ? handlePress : undefined} />;
});
TouchableHighlight.displayName = 'FeedbackTouchableHighlight';

export const TouchableWithoutFeedback = forwardRef<
  React.ElementRef<typeof NativeTouchableWithoutFeedback>,
  React.ComponentProps<typeof NativeTouchableWithoutFeedback> & SoundPreference
>(({ onPress, disabled, sound = true, ...props }, ref) => {
  const handlePress = useCallback<NonNullable<typeof onPress>>((event) => {
    if (disabled) return;
    if (sound) buttonSoundService.play(sound === true ? 'tap' : sound, event);
    onPress?.(event);
  }, [disabled, onPress, sound]);
  return <NativeTouchableWithoutFeedback {...props} ref={ref} disabled={disabled} onPress={onPress ? handlePress : undefined} />;
});
TouchableWithoutFeedback.displayName = 'FeedbackTouchableWithoutFeedback';

export const Switch = forwardRef<
  React.ElementRef<typeof NativeSwitch>,
  React.ComponentProps<typeof NativeSwitch> & SoundPreference
>(({ onValueChange, disabled, sound = true, ...props }, ref) => {
  const handleChange = useCallback<NonNullable<typeof onValueChange>>((value) => {
    if (disabled) return;
    if (sound) buttonSoundService.play(sound === true ? (value ? 'toggle-on' : 'toggle-off') : sound);
    onValueChange?.(value);
  }, [disabled, onValueChange, sound]);
  return <NativeSwitch {...props} ref={ref} disabled={disabled} onValueChange={onValueChange ? handleChange : undefined} />;
});
Switch.displayName = 'FeedbackSwitch';
