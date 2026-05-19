import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { colors, typography } from '../theme';

type AppTextVariant = 'title' | 'section' | 'body' | 'muted' | 'caption';

type AppTextProps = {
  children: ReactNode;
  color?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  variant?: AppTextVariant;
};

export function AppText({
  children,
  color,
  numberOfLines,
  style,
  variant = 'body',
}: AppTextProps) {
  const resolvedColor = color ?? variantColors[variant];

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[styles.base, styles[variant], { color: resolvedColor }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0,
  },
  title: typography.screenTitle,
  section: typography.sectionTitle,
  body: typography.body,
  muted: {
    ...typography.bodySmall,
  },
  caption: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
});

const variantColors: Record<AppTextVariant, string> = {
  title: colors.textPrimary,
  section: colors.textPrimary,
  body: colors.textPrimary,
  muted: colors.textSecondary,
  caption: colors.textMuted,
};
