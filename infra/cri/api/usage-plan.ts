import type { CriApi } from '@infra/cri/api/api'
import type { CriStack } from '@infra/cri/stack'

import { defaultThrottling } from '@infra/cri/api/method-settings'
import { apiStageLogicalId } from '@infra/cri/sam'
import { CfnUsagePlan, CfnUsagePlanKey } from 'aws-cdk-lib/aws-apigateway'

export type CriUsagePlanConfig = {
  api: CriApi
}

export type CriUsagePlanKeyConfig = {
  apiKeyId: string
  usagePlan: CfnUsagePlan
}

export const criUsagePlan = (
  stack: CriStack,
  id: string,
  config: CriUsagePlanConfig
): CfnUsagePlan => {
  const usagePlan = new CfnUsagePlan(stack, id, {
    apiStages: [
      { apiId: config.api.resource.ref, stage: stack.parameters.environment.valueAsString }
    ],
    quota: { limit: 500000, period: 'DAY' },
    throttle: defaultThrottling
  })
  usagePlan.cfnOptions.condition = stack.conditions.isDeployedFromPipeline
  usagePlan.addOverride('DependsOn', [apiStageLogicalId(config.api.resource)])
  return usagePlan
}

export const criUsagePlanKey = (
  stack: CriStack,
  id: string,
  config: CriUsagePlanKeyConfig
): CfnUsagePlanKey => {
  const key = new CfnUsagePlanKey(stack, id, {
    keyId: config.apiKeyId,
    keyType: 'API_KEY',
    usagePlanId: config.usagePlan.ref
  })
  const { condition } = config.usagePlan.cfnOptions
  if (condition) {
    key.cfnOptions.condition = condition
  }
  return key
}
