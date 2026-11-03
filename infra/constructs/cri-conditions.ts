import type { CriStack } from '@infra/constructs/cri-stack'
import type { CriStackParameters } from '@infra/constructs/cri-stack-parameters'
import type { Stack } from 'aws-cdk-lib'

import { CfnCondition, Fn } from 'aws-cdk-lib'

export type CriConditions = ReturnType<typeof createCriConditions>

export const createCriConditions = (
  stack: Stack,
  parameters: CriStackParameters,
  environmentValue: CriStack['environmentValue']
) => {
  const isDeployedFromPipeline = new CfnCondition(stack, 'IsDeployedFromPipeline', {
    expression: Fn.conditionEquals(parameters.deploymentType, 'pipeline')
  })

  return {
    addProvisionedConcurrency: new CfnCondition(stack, 'AddProvisionedConcurrency', {
      expression: Fn.conditionNot(
        Fn.conditionEquals(environmentValue('provisionedConcurrentExecutions'), 0)
      )
    }),
    isDeployedFromPipeline,
    isProduction: new CfnCondition(stack, 'IsProduction', {
      expression: Fn.conditionEquals(parameters.environment, 'production')
    }),
    useCanaryDeploymentAlarms: new CfnCondition(stack, 'UseCanaryDeploymentAlarms', {
      expression: Fn.conditionAnd(
        isDeployedFromPipeline,
        Fn.conditionNot(Fn.conditionEquals(parameters.lambdaDeploymentPreference, 'AllAtOnce'))
      )
    }),
    useCodeSigning: new CfnCondition(stack, 'UseCodeSigning', {
      expression: Fn.conditionNot(Fn.conditionEquals(parameters.codeSigningConfigArn, 'none'))
    }),
    useParameterPrefix: new CfnCondition(stack, 'UseParameterPrefix', {
      expression: Fn.conditionNot(Fn.conditionEquals(parameters.parameterPrefix, 'none'))
    }),
    usePermissionsBoundary: new CfnCondition(stack, 'UsePermissionsBoundary', {
      expression: Fn.conditionNot(Fn.conditionEquals(parameters.permissionsBoundary, 'none'))
    })
  }
}
