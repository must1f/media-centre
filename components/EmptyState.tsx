import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';

interface EmptyStateProps {
  title: string;
  body?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  iconName?: string;
}

export function EmptyState({
  title,
  body,
  ctaLabel,
  onCtaPress,
  iconName = 'popcorn.fill',
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Icon Circle */}
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.surfaceGlassHigh,
            borderColor: colors.borderHighlight,
          },
        ]}
      >
        <SymbolView
          name={iconName as any}
          size={38}
          tintColor={colors.accent}
          weight="medium"
        />
      </View>

      <Text style={[styles.title, { color: colors.label }]}>{title}</Text>
      {body ? (
        <Text style={[styles.body, { color: colors.secondaryLabel }]}>{body}</Text>
      ) : null}

      {ctaLabel && onCtaPress ? (
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.accent }]}
          onPress={onCtaPress}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaLabel}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xs,
    marginTop: Spacing.xxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: FontSize.title3,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: FontSize.subheadline,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginTop: 2,
  },
  cta: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.pill,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.bold,
  },
});
