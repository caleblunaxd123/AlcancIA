/**
 * Jest config scoped to the deterministic Financial Engine (§38/§64).
 *
 * The engine is pure TypeScript with zero React Native imports, so we transform
 * it with a minimal, self-contained babel setup (node target) rather than the
 * heavier jest-expo/react-native preset. Component tests can add a separate
 * project/preset later.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        configFile: false,
        babelrc: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
