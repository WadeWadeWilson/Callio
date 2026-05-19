import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';
import { AppText } from './AppText';

type SectionHeaderProps = {
  actionLabel?: string;
  onActionPress?: () => void;
  title: string;
};

export function SectionHeader({
  actionLabel,
  onActionPress,
  title,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <AppText variant="section">{title}</AppText>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          disabled={!onActionPress}
          onPress={onActionPress}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <AppText color={colors.accent} variant="caption">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
