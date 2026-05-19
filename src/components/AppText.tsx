import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type AppTextVariant = 'title' | 'subtitle' | 'cardTitle' | 'body';

type AppTextProps = {
  children: ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
  variant?: AppTextVariant;
};

export function AppText({
  children,
  color = colors.textPrimary,
  style,
  variant = 'body',
}: AppTextProps) {
  return (
    <Text style={[styles.base, styles[variant], { color }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0,
  },
  title: typography.title,
  subtitle: typography.subtitle,
  cardTitle: typography.cardTitle,
  body: typography.body,
});
