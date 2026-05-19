import React from 'react';
import { StatusBar } from 'react-native';

import { RootNavigator } from '../navigation/RootNavigator';
import { colors } from '../theme';

function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <RootNavigator />
    </>
  );
}

export default App;
