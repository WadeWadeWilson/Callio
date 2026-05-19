import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { createAudioItemRepository } from '../features/library/audioItems';
import { createPlaylistRepository } from '../features/library/playlists';
import { createTagRepository } from '../features/library/tags';
import { initializeDatabase } from '../storage/database/DatabaseProvider';
import { colors, spacing } from '../theme';
import { logger } from '../utils/logger';
import { AppText } from './AppText';
import { Card } from './Card';

type DatabaseStatus = 'initializing' | 'ready' | 'error';

const statusCopy: Record<
  DatabaseStatus,
  { label: string; color: string; description: string }
> = {
  initializing: {
    label: 'wird vorbereitet',
    color: colors.textMuted,
    description: 'Migrationen werden geprueft.',
  },
  ready: {
    label: 'bereit',
    color: colors.accent,
    description: 'callio.db ist geoeffnet. Schema: MVP v2 bereit.',
  },
  error: {
    label: 'Fehler',
    color: colors.danger,
    description: 'Die App bleibt nutzbar, Details stehen im Log.',
  },
};

export function DatabaseStatusPanel() {
  const [databaseStatus, setDatabaseStatus] =
    useState<DatabaseStatus>('initializing');
  const [audioItemCount, setAudioItemCount] = useState<number | null>(null);
  const [playlistCount, setPlaylistCount] = useState<number | null>(null);
  const [tagCount, setTagCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkDatabase = async () => {
      try {
        await initializeDatabase();
        const audioItemRepository = createAudioItemRepository();
        const playlistRepository = createPlaylistRepository();
        const tagRepository = createTagRepository();
        const nextAudioItemCount = await audioItemRepository.count();
        const nextPlaylistCount = await playlistRepository.count();
        const nextTagCount = await tagRepository.count();

        if (isMounted) {
          setAudioItemCount(nextAudioItemCount);
          setPlaylistCount(nextPlaylistCount);
          setTagCount(nextTagCount);
          setDatabaseStatus('ready');
        }
      } catch (error) {
        logger.error('Database status check failed', {
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        if (isMounted) {
          setDatabaseStatus('error');
        }
      }
    };

    checkDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  const copy = statusCopy[databaseStatus];
  const counts =
    audioItemCount !== null && playlistCount !== null && tagCount !== null
      ? ` Audio Items: ${audioItemCount}. Tags: ${tagCount}. Playlists: ${playlistCount}.`
      : '';
  const description =
    databaseStatus === 'ready'
      ? `${copy.description}${counts}`
      : copy.description;

  return (
    <Card style={styles.panel}>
      <View style={styles.header}>
        <AppText variant="section">Lokale Datenbank</AppText>
        <AppText color={copy.color} variant="caption">
          {copy.label}
        </AppText>
      </View>
      <AppText color={colors.textSecondary}>{description}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surfaceMuted,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
});
