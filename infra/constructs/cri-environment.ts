export const environments = ['dev', 'build', 'staging', 'integration', 'production'] as const

export type Environment = (typeof environments)[number]

export const byEnvironment = <T>(row: (environment: Environment) => T): Record<Environment, T> =>
  Object.fromEntries(environments.map((environment) => [environment, row(environment)])) as Record<
    Environment,
    T
  >
