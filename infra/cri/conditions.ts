import type { CriStackParameters } from '@infra/cri/stack-parameters'
import type { Stack } from 'aws-cdk-lib'

import { CfnCondition, Fn } from 'aws-cdk-lib'

export type CriConditions = ReturnType<typeof criConditions>

export const criConditions = (stack: Stack, parameters: CriStackParameters) => ({
  isDeployedFromPipeline: new CfnCondition(stack, 'IsDeployedFromPipeline', {
    expression: Fn.conditionEquals(parameters.deploymentType, 'pipeline')
  }),
  isProduction: new CfnCondition(stack, 'IsProduction', {
    expression: Fn.conditionEquals(parameters.environment, 'production')
  }),
  useParameterPrefix: new CfnCondition(stack, 'UseParameterPrefix', {
    expression: Fn.conditionNot(Fn.conditionEquals(parameters.parameterPrefix, 'none'))
  }),
  usePermissionsBoundary: new CfnCondition(stack, 'UsePermissionsBoundary', {
    expression: Fn.conditionNot(Fn.conditionEquals(parameters.permissionsBoundary, 'none'))
  })
})
