import { defineConfig } from 'vitest/config'

import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src')
    }
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: 'coverage'
    },
    env: {
      POWERTOOLS_METRICS_NAMESPACE: 'ob-api',
      POWERTOOLS_SERVICE_NAME: 'ob-api-vitest'
    },
    include: ['test/unit/**/*.test.ts'],
    silent: 'passed-only'
  }
})
