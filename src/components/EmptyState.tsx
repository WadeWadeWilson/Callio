import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '../theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

type EmptyStateProps = {
  buttonLabel?: string;
  description?: string;
  onButtonPress?: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function EmptyState({
  buttonLabel,
  description,
  onButtonPress,
  style,
  title,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <AppText variant="section">{title}</AppText>
      {description ? (
        <AppText color={colors.textSecondary} style={styles.description}>
          {description}
        </AppText>
      ) : null}
      {buttonLabel ? (
        <AppButton
          onPress={onButtonPress}
          style={styles.button}
          title={buttonLabel}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  description: {
    marginTop: spacing.xs,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
});
