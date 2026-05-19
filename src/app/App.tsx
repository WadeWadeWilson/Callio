import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';

import { appInfo } from './appInfo';
import { RootNavigator } from '../navigation/RootNavigator';
import { colors } from '../theme';
import { logger } from '../utils/logger';

function App() {
  useEffect(() => {
    logger.info('Callio app mounted', {
      environment: appInfo.environment,
      platformTarget: appInfo.platformTarget,
    });
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <RootNavigator />
    </>
  );
}

export default App;
