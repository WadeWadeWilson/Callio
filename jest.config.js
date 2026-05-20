module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@op-engineering/op-sqlite$': '<rootDir>/__mocks__/op-sqlite.js',
    '^@react-native-documents/picker$':
      '<rootDir>/__mocks__/@react-native-documents/picker.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context)/)',
  ],
};
