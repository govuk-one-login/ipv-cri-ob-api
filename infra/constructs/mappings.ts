import type { Environment, Profile } from '@infra/config/environments'
import type { CfnParameter, Stack } from 'aws-cdk-lib'

import { enabledProfiles, environmentConfig, environments } from '@infra/config/environments'
import { CfnMapping } from 'aws-cdk-lib'

export type Mappings = ReturnType<typeof createMappings>

const environmentRow = (environment: Environment) => {
  const config = environmentConfig[environment]
  return {
    dynatraceLayer: config.dynatraceLayer,
    dynatraceSecretArn: config.dynatraceSecretArn,
    endpointProfiles: enabledProfiles(environment).join('|'),
    logFullErrors: String(config.logFullErrors),
    memorySize: config.memorySize,
    provisionedConcurrentExecutions: config.provisionedConcurrentExecutions,
    vcDomain: config.vcDomain
  }
}

const byEnvironment = <T>(row: (environment: Environment) => T): Record<Environment, T> =>
  Object.fromEntries(environments.map((environment) => [environment, row(environment)])) as Record<
    Environment,
    T
  >

export const createMappings = (stack: Stack, environment: CfnParameter) => {
  const environmentConfiguration = new CfnMapping(stack, 'EnvironmentConfiguration', {
    mapping: byEnvironment(environmentRow)
  })

  const profileEndpoints = new CfnMapping(stack, 'ProfileEndpoints', {
    mapping: byEnvironment((env) => environmentConfig[env].enabledProfiles)
  })

  return {
    config: (key: keyof ReturnType<typeof environmentRow>) =>
      environmentConfiguration.findInMap(environment.valueAsString, key),
    endpointUrl: (profile: Profile) =>
      profileEndpoints.findInMap(environment.valueAsString, profile)
  }
}
