import baseConfig from 'shared/eslint-config'

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'off',
      'no-restricted-syntax': 'off',
    },
  },
]
