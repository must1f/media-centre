import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Spacing } from '@/constants/tokens';

interface ErrorStateProps {
  title?: string;
  body?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  body = 'Check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.label }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.secondaryLabel }]}>{body}</Text>
      {onRetry ? (
        <TouchableOpacity
          style={[styles.retryButton, { borderColor: colors.accent }]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={[styles.retryLabel, { color: colors.accent }]}>Retry</Text>
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
  retryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  retryLabel: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
});
