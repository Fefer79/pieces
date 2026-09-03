import baseConfig from './eslint-config/index.js'

export default [
  ...baseConfig,
  {
    // Outillage d'exploitation lancé à la main : `console` y est la sortie
    // normale, et AppError n'a pas de sens hors du runtime API.
    ignores: ['prisma/seed.mjs', 'prisma/manual/**', 'scripts/**'],
  },
]
