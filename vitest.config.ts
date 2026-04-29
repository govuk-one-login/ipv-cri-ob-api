import { defineConfig } from 'vitest/config'

import path from 'node:path'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: 'coverage'
    },
    projects: [
      {
        resolve: {
          alias: {
            '@src': path.resolve(__dirname, 'src')
          }
        },
        test: {
          env: {
            POWERTOOLS_METRICS_NAMESPACE: 'ob-api',
            POWERTOOLS_SERVICE_NAME: 'ob-api-vitest'
          },
          include: ['test/unit/**/*.test.ts'],
          name: 'unit'
        }
      }
    ],
    silent: 'passed-only'
  }
})
