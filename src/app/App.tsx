import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';

import { appInfo } from './appInfo';
import { IS_DEV } from './config';
import { runAudioItemRepositorySmokeTest } from '../features/library/audioItems/audioItemRepositorySmokeTest';
import { runPlaylistRepositorySmokeTest } from '../features/library/playlists/playlistRepositorySmokeTest';
import { runTagRepositorySmokeTest } from '../features/library/tags/tagRepositorySmokeTest';
import { RootNavigator } from '../navigation/RootNavigator';
import { initializeDatabase } from '../storage/database/DatabaseProvider';
import { runSchemaCheck } from '../storage/database/schemaCheck';
import { runDatabaseSmokeTest } from '../storage/database/smokeTest';
import { colors } from '../theme';
import { logger } from '../utils/logger';

function App() {
  useEffect(() => {
    logger.info('Callio app mounted', {
      environment: appInfo.environment,
      platformTarget: appInfo.platformTarget,
    });

    const initializeLocalDatabase = async () => {
      try {
        await initializeDatabase();

        if (IS_DEV) {
          await runDatabaseSmokeTest();
          await runSchemaCheck();
          await runAudioItemRepositorySmokeTest();
          await runTagRepositorySmokeTest();
          await runPlaylistRepositorySmokeTest();
        }
      } catch (error) {
        logger.error('Database startup failed', {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    };

    initializeLocalDatabase();
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <RootNavigator />
    </>
  );
}

export default App;
