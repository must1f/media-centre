import React from 'react';
import { ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

interface AnimatedPressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  scaleTo?: number;
  haptic?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'header';
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.8,
};

const AnimatedPressableInner = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  style,
  onPress,
  onLongPress,
  scaleTo = 0.95,
  haptic = true,
  disabled = false,
  accessibilityLabel,
  accessibilityRole = 'button',
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    if (disabled) return;
    scale.value = withSpring(scaleTo, SPRING_CONFIG);
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  return (
    <AnimatedPressableInner
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressableInner>
  );
}
