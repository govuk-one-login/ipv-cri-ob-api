import type { CriStack } from '@infra/constructs/cri-stack'
import type { CfnApi } from 'aws-cdk-lib/aws-sam'

import { CfnOutput, Fn } from 'aws-cdk-lib'
import { CfnUsagePlan, CfnUsagePlanKey } from 'aws-cdk-lib/aws-apigateway'

export type CriUsagePlanConfig = {
  api: CfnApi
}

export const criUsagePlan = (
  stack: CriStack,
  id: string,
  config: CriUsagePlanConfig
): CfnUsagePlan => {
  const usagePlan = new CfnUsagePlan(stack, id, {
    apiStages: [{ apiId: config.api.ref, stage: stack.parameters.environment.valueAsString }],
    quota: { limit: 500000, period: 'DAY' },
    throttle: { burstLimit: 400, rateLimit: 200 }
  })
  usagePlan.cfnOptions.condition = stack.conditions.isDeployedFromPipeline
  usagePlan.addOverride('DependsOn', [`${config.api.node.id}Stage`])
  return usagePlan
}

export const ipvCoreApiKeys = (stack: CriStack, usagePlan: CfnUsagePlan) => {
  const { isDeployedFromPipeline } = stack.conditions

  const ipvCoreApiKey = new CfnUsagePlanKey(stack, 'LinkUsagePlanApiKey1', {
    keyId: Fn.importValue('core-infrastructure-ApiKey1'),
    keyType: 'API_KEY',
    usagePlanId: usagePlan.ref
  })
  ipvCoreApiKey.cfnOptions.condition = isDeployedFromPipeline

  new CfnUsagePlanKey(stack, 'LinkUsagePlanApiKey2', {
    keyId: Fn.importValue('core-infrastructure-ApiKey2'),
    keyType: 'API_KEY',
    usagePlanId: usagePlan.ref
  }).cfnOptions.condition = isDeployedFromPipeline

  new CfnOutput(stack, 'IpvCoreBackApiKeyId', {
    condition: isDeployedFromPipeline,
    description: 'The ID of the API key used by IPV Core to access the public API gateway',
    value: ipvCoreApiKey.ref
  })
}
