import type { CriStack } from '@infra/cri/stack'

import { criApi } from '@infra/cri/api/api'
import { criUsagePlan, criUsagePlanKey } from '@infra/cri/api/usage-plan'
import { Fn } from 'aws-cdk-lib'
import { resolve } from 'node:path'

const openApiDefinition = (file: string) => resolve(import.meta.dirname, '../api', file)

export const apiGateways = (stack: CriStack) => {
  const publicApi = criApi(stack, 'PublicAPI', {
    definition: openApiDefinition('public-api.yaml'),
    description: 'Public Open Banking CRI API',
    throttledRoutes: [
      // TODO: LIME-2542 consider lowering these values
      { method: 'POST', path: '/webhooks', throttle: { burstLimit: 400, rateLimit: 200 } }
    ],
    visibility: 'public'
  })
  const publicUsagePlan = criUsagePlan(stack, 'PublicAPIUsagePlan', { api: publicApi })

  const ipvCoreApiKeyHot = criUsagePlanKey(stack, 'LinkUsagePlanApiKey1', {
    apiKeyId: Fn.importValue('core-infrastructure-ApiKey1'),
    usagePlan: publicUsagePlan
  })
  const ipvCoreApiKeySpare = criUsagePlanKey(stack, 'LinkUsagePlanApiKey2', {
    apiKeyId: Fn.importValue('core-infrastructure-ApiKey2'),
    usagePlan: publicUsagePlan
  })

  const privateApi = criApi(stack, 'PrivateAPI', {
    definition: openApiDefinition('private-api.yaml'),
    description: 'Private Open Banking CRI API',
    visibility: 'private'
  })
  criUsagePlan(stack, 'PrivateAPIUsagePlan', { api: privateApi })

  return { ipvCoreApiKeyHot, ipvCoreApiKeySpare, privateApi, publicApi }
}
