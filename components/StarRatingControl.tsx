import React, { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  PanResponder,
  LayoutChangeEvent,
  Platform,
  AccessibilityActionEvent,
} from 'react-native';
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
import { FontSize, FontWeight, Spacing } from '@/constants/tokens';

const STAR_COUNT = 5;
const MIN_RATING = 0.5;
const MAX_RATING = 5.0;
const STEP = 0.5;

interface StarRatingControlProps {
  value: number | null; // null = no rating set
  onChange: (value: number) => void;
  size?: number;
  readOnly?: boolean;
  /** Fill color for filled stars. Defaults to the gold rating color. */
  color?: string;
  /** Color for unfilled star outlines. Defaults to the theme's tertiary label. */
  emptyColor?: string;
}

function clampRating(raw: number): number {
  const stepped = Math.round(raw / STEP) * STEP;
  return Math.max(MIN_RATING, Math.min(MAX_RATING, stepped));
}

function AnimatedStarItem({
  index,
  filled,
  size,
  readOnly,
  onTap,
  colors,
  color,
  emptyColor,
}: {
  index: number;
  filled: number;
  size: number;
  readOnly: boolean;
  onTap: (index: number, isHalf: boolean) => void;
  colors: any;
  color: string;
  emptyColor: string;
}) {
  const starValue = index + 1;
  const isFullFilled = filled >= starValue;
  const isHalfFilled = !isFullFilled && filled >= starValue - 0.5;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (isHalf: boolean) => {
    scale.value = withSequence(
      withTiming(1.35, { duration: 120 }),
      withSpring(1.0, { damping: 10, stiffness: 200 })
    );
    onTap(index, isHalf);
  };

  return (
    <Animated.View style={[styles.starContainer, { width: size, height: size }, animatedStyle]}>
      {/* Half-star tap zone */}
      {!readOnly && (
        <TouchableOpacity
          style={[styles.halfTap, { left: 0 }]}
          onPress={() => handlePress(true)}
          hitSlop={{ top: 8, bottom: 8 }}
          activeOpacity={1}
        />
      )}
      {/* Full-star tap zone */}
      {!readOnly && (
        <TouchableOpacity
          style={[styles.halfTap, { right: 0 }]}
          onPress={() => handlePress(false)}
          hitSlop={{ top: 8, bottom: 8 }}
          activeOpacity={1}
        />
      )}
      {/* SF Symbol star glyph */}
      <SymbolView
        name={isFullFilled ? 'star.fill' : isHalfFilled ? 'star.leadinghalf.filled' : 'star'}
        size={size}
        tintColor={isFullFilled || isHalfFilled ? color : emptyColor}
        weight="medium"
      />
    </Animated.View>
  );
}

export function StarRatingControl({
  value,
  onChange,
  size = 32,
  readOnly = false,
  color,
  emptyColor,
}: StarRatingControlProps) {
  const { colors } = useTheme();
  const starColor = color ?? colors.starGold ?? '#FFD60A';
  const starEmptyColor = emptyColor ?? colors.tertiaryLabel;
  const containerWidth = useRef<number>(0);
  const lastHapticValue = useRef<number | null>(null);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    containerWidth.current = e.nativeEvent.layout.width;
  }, []);

  function ratingFromX(x: number): number {
    const total = containerWidth.current;
    if (total <= 0) return value ?? MIN_RATING;
    const ratio = Math.max(0, Math.min(1, x / total));
    return clampRating(ratio * MAX_RATING);
  }

  async function fireHapticIfChanged(newValue: number) {
    if (newValue !== lastHapticValue.current) {
      lastHapticValue.current = newValue;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !readOnly,
      onMoveShouldSetPanResponder: () => !readOnly,
      onPanResponderGrant: async (e) => {
        const newVal = ratingFromX(e.nativeEvent.locationX);
        await fireHapticIfChanged(newVal);
        onChange(newVal);
      },
      onPanResponderMove: async (e) => {
        const newVal = ratingFromX(e.nativeEvent.locationX);
        await fireHapticIfChanged(newVal);
        onChange(newVal);
      },
    }),
  ).current;

  function handleStarTap(starIndex: number, isHalf: boolean) {
    if (readOnly) return;
    const newVal = clampRating(starIndex + (isHalf ? 0.5 : 1));
    fireHapticIfChanged(newVal);
    onChange(newVal);
  }

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (readOnly) return;
    if (event.nativeEvent.actionName === 'increment') {
      onChange(clampRating((value ?? 0) + STEP));
    } else if (event.nativeEvent.actionName === 'decrement') {
      onChange(clampRating((value ?? 0) - STEP));
    }
  };

  const filled = value ?? 0;

  return (
    <View
      style={styles.wrapper}
      accessibilityRole="adjustable"
      accessibilityLabel={
        filled > 0
          ? `Rating, ${filled} of 5 stars, adjustable`
          : 'Rating, not set, adjustable'
      }
      accessibilityValue={{
        min: 0,
        max: MAX_RATING,
        now: filled,
        text: filled > 0 ? `${filled} stars` : 'No rating',
      }}
      accessibilityActions={[
        { name: 'increment', label: 'Increment rating' },
        { name: 'decrement', label: 'Decrement rating' },
      ]}
      onAccessibilityAction={handleAccessibilityAction}
    >
      {/* Drag hit area */}
      <View
        style={styles.starsRow}
        onLayout={handleLayout}
        {...(!readOnly ? panResponder.panHandlers : {})}
      >
        {Array.from({ length: STAR_COUNT }, (_, i) => (
          <AnimatedStarItem
            key={i}
            index={i}
            filled={filled}
            size={size}
            readOnly={readOnly}
            onTap={handleStarTap}
            colors={colors}
            color={starColor}
            emptyColor={starEmptyColor}
          />
        ))}
      </View>

      {/* Numeric display */}
      {value != null && (
        <Text
          style={[
            styles.numericLabel,
            { color: starColor, fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined },
          ]}
        >
          {value.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  starContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  halfTap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 1,
  },
  numericLabel: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
  },
});
