import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';

interface ErrorStateProps {
  title?: string;
  body?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Unable to Load',
  body = 'Check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
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
          name="exclamationmark.triangle.fill"
          size={36}
          tintColor={colors.accent}
          weight="semibold"
        />
      </View>
      <Text style={[styles.title, { color: colors.label }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.secondaryLabel }]}>{body}</Text>
      {onRetry ? (
        <TouchableOpacity
          style={[
            styles.retryButton,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 4,
            },
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          activeOpacity={0.8}
        >
          <Text style={styles.retryLabel}>Try Again</Text>
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
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: FontSize.subheadline,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  retryLabel: {
    color: '#FFFFFF',
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.bold,
  },
});
