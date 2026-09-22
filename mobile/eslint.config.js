const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'babel.config.js', 'jest.config.js', 'eslint.config.js'],
  },
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Reanimated shared values are mutated via `.value =` by design; the
      // React Compiler immutability rule flags this legitimate API.
      'react-hooks/immutability': 'off',
    },
  },
];
