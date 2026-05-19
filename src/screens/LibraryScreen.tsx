import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { colors, radius, spacing } from '../theme';

const libraryPlaceholders = [
  'Musik',
  'Podcasts',
  'Hörbücher',
  'Tags',
  'Nicht organisiert',
];

export function LibraryScreen() {
  return (
    <Screen>
      <AppText variant="title">Bibliothek</AppText>

      <SectionHeader title="Alle Inhalte" />
      <Card>
        <EmptyState
          description="Der Import kommt in einem späteren Schritt."
          title="Noch keine Inhalte importiert."
        />
      </Card>

      <SectionHeader title="Sammlungen" />
      <Card>
        <AppText color={colors.textSecondary}>
          Platzhalter für die spätere Organisation deiner Bibliothek.
        </AppText>
        <AppText variant="caption" style={styles.caption}>
          Noch ohne Filterfunktion
        </AppText>
        <View style={styles.chipGroup}>
          {libraryPlaceholders.map(item => (
            <AppText key={item} style={styles.chip} variant="muted">
              {item}
            </AppText>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  caption: {
    marginTop: spacing.sm,
  },
  chipGroup: {
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
