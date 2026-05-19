import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import type { PlayerScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function PlayerScreen({ navigation }: PlayerScreenProps) {
  return (
    <Screen>
      <AppText variant="title">Player</AppText>

      <Card style={styles.playerCard}>
        <AppText variant="cardTitle">Noch kein Track aktiv.</AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <AppText style={styles.buttonText}>Zurück</AppText>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    marginTop: spacing.lg,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
