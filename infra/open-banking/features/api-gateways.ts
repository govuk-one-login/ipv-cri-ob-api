import type { OpenBankingStack } from '@infra/open-banking/stack'

import { criApi } from '@infra/cri/api/api'
import { criUsagePlan, criUsagePlanKey } from '@infra/cri/api/usage-plan'
import { Aws, Fn, Token } from 'aws-cdk-lib'
import { resolve } from 'node:path'

const openApiDefinition = (file: string) => resolve(import.meta.dirname, '../api', file)

export const apiGateways = (stack: OpenBankingStack) => {
  const { isDeployedFromPipeline } = stack.conditions

  const publicApi = criApi(stack, 'PublicAPI', {
    definition: openApiDefinition('public-api.yaml'),
    description: 'Public Open Banking CRI API',
    endpointType: 'REGIONAL',
    label: 'Public',
    throttledRoutes: [
      // TODO: LIME-2542 consider lowering these values
      { method: 'POST', path: '/webhooks', throttle: { burstLimit: 400, rateLimit: 200 } }
    ]
  })
  const publicUsagePlan = criUsagePlan(stack, 'PublicAPIUsagePlan', { api: publicApi })

  const ipvCoreApiKeys = [
    criUsagePlanKey(stack, 'LinkUsagePlanApiKey1', {
      apiKeyId: Fn.importValue('core-infrastructure-ApiKey1'),
      usagePlan: publicUsagePlan
    }),
    criUsagePlanKey(stack, 'LinkUsagePlanApiKey2', {
      apiKeyId: Fn.importValue('core-infrastructure-ApiKey2'),
      usagePlan: publicUsagePlan
    })
  ] as const

  // only reachable through the VPC endpoint when deployed from the pipeline
  const privateApi = criApi(stack, 'PrivateAPI', {
    definition: openApiDefinition('private-api.yaml'),
    description: 'Private Open Banking CRI API',
    endpointType: Token.asString(
      Fn.conditionIf(isDeployedFromPipeline.logicalId, 'PRIVATE', 'REGIONAL')
    ),
    label: 'Private',
    resourcePolicy: [
      {
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Principal: '*',
        Resource: ['execute-api:/*']
      },
      Fn.conditionIf(
        isDeployedFromPipeline.logicalId,
        {
          Action: 'execute-api:Invoke',
          Condition: {
            StringNotEquals: {
              'aws:SourceVpce': [
                Fn.importValue(Fn.sub('${VpcStackName}-ExecuteApiGatewayEndpointId'))
              ]
            }
          },
          Effect: 'Deny',
          Principal: '*',
          Resource: ['execute-api:/*']
        },
        Aws.NO_VALUE
      )
    ]
  })
  criUsagePlan(stack, 'PrivateAPIUsagePlan', { api: privateApi })

  return { ipvCoreApiKeys, privateApi, publicApi }
}
