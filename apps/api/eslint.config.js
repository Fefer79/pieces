import baseConfig from 'shared/eslint-config'

export default [
  ...baseConfig,
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
]
