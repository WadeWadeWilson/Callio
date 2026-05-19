import { StyleSheet, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import type { PlayerScreenProps } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

export function PlayerScreen({ navigation }: PlayerScreenProps) {
  return (
    <Screen>
      <AppText variant="title">Player</AppText>

      <Card style={styles.playerCard}>
        <View style={styles.coverPlaceholder}>
          <View style={styles.coverMark} />
        </View>
        <AppText style={styles.title} variant="section">
          Noch kein Track aktiv.
        </AppText>
        <AppText color={colors.textSecondary}>
          Sobald du Audio importierst, erscheint hier die Wiedergabe.
        </AppText>
        <AppButton
          onPress={() => navigation.goBack()}
          style={styles.button}
          title="Zurück"
          variant="secondary"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    marginTop: spacing.lg,
  },
  coverPlaceholder: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: '100%',
  },
  coverMark: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    height: 56,
    opacity: 0.22,
    width: 56,
  },
  title: {
    marginBottom: spacing.xs,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
});
