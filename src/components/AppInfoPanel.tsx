import { StyleSheet, View } from 'react-native';

import { appInfo } from '../app/appInfo';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <AppText color={colors.textMuted} variant="caption">
        {label}
      </AppText>
      <AppText numberOfLines={1} variant="muted">
        {value}
      </AppText>
    </View>
  );
}

export function AppInfoPanel() {
  return (
    <Card style={styles.panel}>
      <AppText variant="section">{appInfo.appName}</AppText>
      <View style={styles.rows}>
        <InfoRow label="Version" value={appInfo.appVersion} />
        <InfoRow label="Build" value={appInfo.buildNumber} />
        <InfoRow label="Environment" value={appInfo.environment} />
        <InfoRow label="Platform" value={appInfo.platformTarget} />
        <InfoRow label="Storage" value={appInfo.storageStrategy} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.md,
  },
  rows: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
});
