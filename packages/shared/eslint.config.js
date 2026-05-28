import baseConfig from './eslint-config/index.js'

export default [
  ...baseConfig,
  {
    ignores: ['prisma/seed.mjs'],
  },
]
