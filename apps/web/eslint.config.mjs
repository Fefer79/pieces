import nextConfig from 'eslint-config-next'

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['public/sw.js', 'public/swe-worker-*.js'],
  },
  {
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ThrowStatement > NewExpression[callee.name="Error"]',
          message: 'Use AppError instead of throw new Error()',
        },
      ],
    },
  },
]

export default eslintConfig
