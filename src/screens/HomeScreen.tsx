import { useNavigation } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';

import { appInfo } from '../app/appInfo';
import { AppInfoPanel } from '../components/AppInfoPanel';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { DatabaseStatusPanel } from '../components/DatabaseStatusPanel';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import type { HomeTabNavigation, RootStackNavigation } from '../navigation/types';
import { colors, spacing } from '../theme';

export function HomeScreen() {
  const navigation = useNavigation<HomeTabNavigation>();
  const rootNavigation = navigation.getParent<RootStackNavigation>();

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{appInfo.appName}</AppText>
        <AppText color={colors.textSecondary} style={styles.subtitle}>
          {appInfo.appTagline}
        </AppText>
      </View>

      <SectionHeader title="Weiterhören" />
      <Card>
        <EmptyState
          buttonLabel="Player öffnen"
          onButtonPress={() => rootNavigation?.navigate('Player')}
          title="Noch nichts abgespielt."
        />
      </Card>

      <SectionHeader title="Favoriten" />
      <Card>
        <EmptyState
          description="Markierte Inhalte landen in einer späteren Version an dieser Stelle."
          title="Favoriten erscheinen später hier."
        />
      </Card>

      <SectionHeader title="App-Info" />
      <AppInfoPanel />

      <SectionHeader title="Persistenz" />
      <DatabaseStatusPanel />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
});
