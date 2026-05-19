import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import type { HomeTabNavigation, RootStackNavigation } from '../navigation/types';

export function HomeScreen() {
  const navigation = useNavigation<HomeTabNavigation>();
  const rootNavigation = navigation.getParent<RootStackNavigation>();

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Callio</AppText>
        <AppText variant="subtitle" color={colors.textSecondary}>
          Deine Audiobibliothek. Immer bereit.
        </AppText>
      </View>

      <Card>
        <AppText variant="cardTitle">Weiterhören</AppText>
        <AppText color={colors.textSecondary} style={styles.cardBody}>
          Noch kein Track aktiv.
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => rootNavigation?.navigate('Player')}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <AppText style={styles.buttonText}>Player öffnen</AppText>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  cardBody: {
    marginTop: spacing.sm,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 8,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: colors.background,
    fontWeight: '700',
  },
});
