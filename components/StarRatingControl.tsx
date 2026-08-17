import React, { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  PanResponder,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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
}

function clampRating(raw: number): number {
  const stepped = Math.round(raw / STEP) * STEP;
  return Math.max(MIN_RATING, Math.min(MAX_RATING, stepped));
}

/**
 * 0.5–5.0 star rating control in 0.5 increments.
 * Supports tapping a star and dragging left/right to adjust.
 * Fires a light haptic on each 0.5 step change.
 * Announces as "Rating, X of 5 stars, adjustable" for VoiceOver.
 */
export function StarRatingControl({ value, onChange, size = 32, readOnly = false }: StarRatingControlProps) {
  const { colors } = useTheme();
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
      onAccessibilityIncrement={() => onChange(clampRating((value ?? 0) + STEP))}
      onAccessibilityDecrement={() => onChange(clampRating((value ?? 0) - STEP))}
    >
      {/* Drag hit area */}
      <View
        style={styles.starsRow}
        onLayout={handleLayout}
        {...(!readOnly ? panResponder.panHandlers : {})}
      >
        {Array.from({ length: STAR_COUNT }, (_, i) => {
          const starValue = i + 1;
          const isFullFilled = filled >= starValue;
          const isHalfFilled = !isFullFilled && filled >= starValue - 0.5;

          return (
            <View key={i} style={styles.starContainer}>
              {/* Half-star tap zone (left half) */}
              {!readOnly && (
                <TouchableOpacity
                  style={[styles.halfTap, { left: 0 }]}
                  onPress={() => handleStarTap(i, true)}
                  hitSlop={{ top: 8, bottom: 8 }}
                  activeOpacity={1}
                />
              )}
              {/* Full-star tap zone (right half) */}
              {!readOnly && (
                <TouchableOpacity
                  style={[styles.halfTap, { right: 0 }]}
                  onPress={() => handleStarTap(i, false)}
                  hitSlop={{ top: 8, bottom: 8 }}
                  activeOpacity={1}
                />
              )}
              {/* Star glyph — simple unicode star for now (expo-symbols in Phase 12) */}
              <Text
                style={[
                  styles.star,
                  {
                    fontSize: size,
                    color: isFullFilled || isHalfFilled ? colors.accent : colors.separator,
                  },
                ]}
              >
                {isFullFilled ? '★' : isHalfFilled ? '⯨' : '☆'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Numeric display in SF Pro Rounded style */}
      {value != null && (
        <Text
          style={[styles.numericLabel, { color: colors.accent, fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined }]}
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
    gap: 2,
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
  star: {
    lineHeight: undefined,
  },
  numericLabel: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
  },
});
