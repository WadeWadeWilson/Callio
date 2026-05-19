import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

type ScreenProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  contentContainerStyle,
  scrollable = true,
  style,
}: ScreenProps) {
  const contentStyle = [styles.content, contentContainerStyle];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      {scrollable ? (
        <ScrollView
          style={[styles.container, style]}
          contentContainerStyle={contentStyle}
          alwaysBounceVertical={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[styles.container, styles.content, contentContainerStyle, style]}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
