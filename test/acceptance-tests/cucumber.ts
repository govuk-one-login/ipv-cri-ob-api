import type { IConfiguration } from '@cucumber/cucumber/api'

import { join } from 'node:path'

try {
  process.loadEnvFile(join(import.meta.dirname, '.env'))
  console.log(`🚨 local .env loaded: ${join(import.meta.dirname, '.env')}`)
} catch {}

const sharedOptions: Partial<IConfiguration> = {
  format: [process.stdout.isTTY ? 'progress-bar' : 'progress'],
  paths: ['test/acceptance-tests/features/**/*.feature'],
  require: ['test/acceptance-tests/world.ts', 'test/acceptance-tests/steps/**/*.ts'],
  requireModule: ['tsx']
}

export default {
  ...sharedOptions
}

export const api: Partial<IConfiguration> = {
  ...sharedOptions,
  tags: '@api-test'
}

export const smoke: Partial<IConfiguration> = {
  ...sharedOptions,
  tags: '@QualityGateSmokeTest'
}

export const regression: Partial<IConfiguration> = {
  ...sharedOptions,
  tags: '@QualityGateRegressionTest'
}

export const integration: Partial<IConfiguration> = {
  ...sharedOptions,
  tags: '@QualityGateIntegrationTest'
}
