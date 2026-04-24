import { defineConfig } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['step-definitions/**/*.steps.ts', 'fixtures.ts'],
  tags: '@ob-api'
})

export default defineConfig({
  expect: { timeout: 10_000 },
  outputDir: 'reports/test-results',
  reporter: [['html', { open: 'never', outputFolder: 'reports/api-report' }]],
  retries: 1,
  testDir,
  timeout: 30_000,
  use: {
    baseURL: process.env['API_BASE_URL'] ?? 'http://localhost:3000'
  },
  workers: 1
})
