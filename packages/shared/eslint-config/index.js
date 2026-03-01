import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...tseslint.configs.strict,
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
  {
    ignores: ['dist/', '.next/', 'node_modules/', 'coverage/'],
  },
]
