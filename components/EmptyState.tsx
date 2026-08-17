import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Spacing } from '@/constants/tokens';

interface EmptyStateProps {
  title: string;
  body?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ title, body, ctaLabel, onCtaPress }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
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
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  body: {
    fontSize: FontSize.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  cta: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
});
