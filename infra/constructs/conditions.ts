import type { Profile } from '@infra/config/environments'
import type { Mappings } from '@infra/constructs/mappings'
import type { StackParameters } from '@infra/constructs/stack-parameters'
import type { IResolvable, Stack } from 'aws-cdk-lib'

import { environmentsWithProfile } from '@infra/config/environments'
import { Aws, CfnCondition, Fn } from 'aws-cdk-lib'

export type Conditions = ReturnType<typeof createConditions>

export const ifCondition = (
  condition: CfnCondition,
  whenTrue: unknown,
  whenFalse: unknown = Aws.NO_VALUE
): IResolvable => Fn.conditionIf(condition.logicalId, whenTrue, whenFalse)

export const createConditions = (stack: Stack, parameters: StackParameters, mappings: Mappings) => {
  const isDeployedFromPipeline = new CfnCondition(stack, 'IsDeployedFromPipeline', {
    expression: Fn.conditionEquals(parameters.deploymentType, 'pipeline')
  })
  const isProduction = new CfnCondition(stack, 'IsProduction', {
    expression: Fn.conditionEquals(parameters.environment, 'production')
  })

  const isEnvironmentWithProfile = (profile: Profile) =>
    Fn.conditionOr(
      ...environmentsWithProfile(profile).map((environment) =>
        Fn.conditionEquals(parameters.environment, environment)
      )
    )

  const createProfileSpecificParameters = (id: string, profile: Profile) =>
    new CfnCondition(stack, id, {
      expression: Fn.conditionAnd(isDeployedFromPipeline, isEnvironmentWithProfile(profile))
    })

  return {
    addProvisionedConcurrency: new CfnCondition(stack, 'AddProvisionedConcurrency', {
      expression: Fn.conditionNot(
        Fn.conditionEquals(mappings.config('provisionedConcurrentExecutions'), 0)
      )
    }),
    createStubParameters: createProfileSpecificParameters('CreateStubParameters', 'STUB'),
    createUatParameters: createProfileSpecificParameters('CreateUatParameters', 'UAT'),
    createLiveParameters: createProfileSpecificParameters('CreateLiveParameters', 'LIVE'),
    createTestResourcesParam: new CfnCondition(stack, 'CreateTestResourcesParam', {
      expression: Fn.conditionAnd(isDeployedFromPipeline, Fn.conditionNot(isProduction))
    }),
    isDeployedFromPipeline,
    isProduction,
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
