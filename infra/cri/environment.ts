export const environments = ['dev', 'build', 'staging', 'integration', 'production'] as const

export type CriEnvironmentConfig = {
  dynatraceLayer: string
  dynatraceSecretArn: string
  logFullErrors: boolean
  logGroupRetentionInDays: number
  memorySize: number
  provisionedConcurrentExecutions: number
  vcDomain: string
}

export type Environment = (typeof environments)[number]

export const byEnvironment = <T>(row: (environment: Environment) => T): Record<Environment, T> =>
  Object.fromEntries(environments.map((environment) => [environment, row(environment)])) as Record<
    Environment,
    T
  >

export const environmentConfigurationRow = (config: CriEnvironmentConfig) => ({
  dynatraceLayer: config.dynatraceLayer,
  dynatraceSecretArn: config.dynatraceSecretArn,
  logFullErrors: String(config.logFullErrors),
  logGroupRetentionInDays: config.logGroupRetentionInDays,
  memorySize: config.memorySize,
  provisionedConcurrentExecutions: config.provisionedConcurrentExecutions,
  vcDomain: config.vcDomain
})
