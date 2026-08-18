import React from 'react';
import { StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/context/ThemeContext';
import { Radius } from '@/constants/tokens';

type ToggleType = 'like' | 'watchlist' | 'share';

interface ToggleButtonProps {
  type: ToggleType;
  isActive?: boolean;
  onToggle: (newState: boolean) => void;
  size?: number;
  style?: ViewStyle;
}

const CONFIG: Record<ToggleType, {
  activeSymbol: string;
  inactiveSymbol: string;
  activeLabel: string;
  inactiveLabel: string;
  activeColor: string;
}> = {
  like: {
    activeSymbol: 'heart.fill',
    inactiveSymbol: 'heart',
    activeLabel: 'Unlike',
    inactiveLabel: 'Like',
    activeColor: '#FF375F',
  },
  watchlist: {
    activeSymbol: 'bookmark.fill',
    inactiveSymbol: 'bookmark',
    activeLabel: 'Remove from watchlist',
    inactiveLabel: 'Add to watchlist',
    activeColor: '#FF9F0A',
  },
  share: {
    activeSymbol: 'square.and.arrow.up',
    inactiveSymbol: 'square.and.arrow.up',
    activeLabel: 'Share',
    inactiveLabel: 'Share',
    activeColor: '#0A84FF',
  },
};

export function ToggleButton({
  type,
  isActive = false,
  onToggle,
  size = 20,
  style,
}: ToggleButtonProps) {
  const { colors } = useTheme();
  const config = CONFIG[type];
  const symbolName = isActive ? config.activeSymbol : config.inactiveSymbol;
  const label = isActive ? config.activeLabel : config.inactiveLabel;
  const tintColor = isActive ? config.activeColor : colors.label;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  async function handlePress() {
    scale.value = withSequence(
      withTiming(1.28, { duration: 120 }),
      withSpring(1.0, { damping: 10, stiffness: 220 })
    );
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle(!isActive);
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.button,
          {
            backgroundColor: colors.searchBarBackground,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isActive }}
      >
        <SymbolView
          name={symbolName as any}
          size={size}
          tintColor={tintColor}
          weight={isActive ? 'semibold' : 'regular'}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    borderCurve: 'continuous',
  },
});
