import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      shared: path.resolve(__dirname, '../../packages/shared'),
    },
  },
})
