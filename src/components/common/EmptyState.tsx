import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { useTheme } from '../../hooks/useTheme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '✦', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.icon, { color: Colors.gold }]}>{icon}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  icon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semiBold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.small,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    color: Colors.gold,
    fontSize: FontSize.small,
    fontWeight: FontWeight.semiBold,
  },
});
