import { StyleSheet } from 'react-native';

import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function LibraryScreen() {
  return (
    <Screen>
      <AppText variant="title">Bibliothek</AppText>

      <Card style={styles.emptyState}>
        <AppText variant="cardTitle">Noch keine Inhalte importiert.</AppText>
        <AppText color={colors.textSecondary} style={styles.copy}>
          Import kommt im nächsten Schritt.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    marginTop: spacing.lg,
  },
  copy: {
    marginTop: spacing.sm,
  },
});
