const sharedOptions = {
  format: ['progress-bar'],
  paths: ['test/acceptance-tests/features/**/*.feature'],
  publishQuiet: true,
  require: ['test/acceptance-tests/world.ts', 'test/acceptance-tests/steps/**/*.ts'],
  requireModule: ['tsx']
}

export default {
  ...sharedOptions
}

export const api = {
  ...sharedOptions,
  tags: '@api-test'
}

export const smoke = {
  ...sharedOptions,
  tags: '@QualityGateSmokeTest'
}

export const regression = {
  ...sharedOptions,
  tags: '@QualityGateRegressionTest'
}

export const integration = {
  ...sharedOptions,
  tags: '@QualityGateIntegrationTest'
}
