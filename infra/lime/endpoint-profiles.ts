import type { Environment } from '@infra/cri/environment'
import type { CriStack } from '@infra/cri/stack'

import { byEnvironment, environments } from '@infra/cri/environment'
import { CfnCondition, CfnMapping, Fn } from 'aws-cdk-lib'

export const endpointProfiles = ['STUB', 'UAT', 'LIVE'] as const

export type EndpointProfile = (typeof endpointProfiles)[number]

export type EndpointProfileUrls = Partial<Record<EndpointProfile, string>>

export type LimeEndpointProfiles = ReturnType<typeof limeEndpointProfiles>

type EndpointProfileContext = {
  condition: CfnCondition
  idPrefix: string
  profile: EndpointProfile
}

// the metric dimension the CRI publishes endpoint profile metrics with
export const endpointProfileDimension = (profile: EndpointProfile) => ({
  name: 'endpoint_profile',
  value: profile
})

const pascalCase = (profile: EndpointProfile) => profile.charAt(0) + profile.slice(1).toLowerCase()

export const limeEndpointProfiles = (
  stack: CriStack,
  urls: Record<Environment, EndpointProfileUrls>
) => {
  const environment = stack.parameters.environment
  const enabledIn = (env: Environment) => endpointProfiles.filter((profile) => profile in urls[env])

  const mapping = new CfnMapping(stack, 'EndpointProfiles', {
    mapping: byEnvironment((env) => ({ enabled: enabledIn(env).join('|'), ...urls[env] }))
  })

  // profile specific resources only exist in pipeline deployments to environments with that profile
  const createResources = (profile: EndpointProfile) =>
    new CfnCondition(stack, `Create${pascalCase(profile)}EndpointProfileResources`, {
      expression: Fn.conditionAnd(
        stack.conditions.isDeployedFromPipeline,
        Fn.conditionOr(
          ...environments
            .filter((env) => enabledIn(env).includes(profile))
            .map((env) => Fn.conditionEquals(environment, env))
        )
      )
    })

  const conditions = {
    LIVE: createResources('LIVE'),
    STUB: createResources('STUB'),
    UAT: createResources('UAT')
  }

  return {
    enabled: mapping.findInMap(environment.valueAsString, 'enabled'), // e.g. STUB|UAT
    forEachProfile: (create: (context: EndpointProfileContext) => void) => {
      for (const profile of endpointProfiles) {
        create({ condition: conditions[profile], idPrefix: pascalCase(profile), profile })
      }
    },
    url: (profile: EndpointProfile) => mapping.findInMap(environment.valueAsString, profile)
  }
}
