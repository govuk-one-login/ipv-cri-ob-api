import type { CriAlarmConfig } from '@infra/cri/alarm'
import type { ApiRoute } from '@infra/cri/api/api'
import type { CriFunction } from '@infra/cri/function'
import type { CriStack } from '@infra/cri/stack'

import { criAlarm } from '@infra/cri/alarm'
import { apiRouteDimensions } from '@infra/cri/api/api'
import { findOrCreate } from '@infra/cri/find-or-create'
import { Aws, CfnCondition, Fn, Token } from 'aws-cdk-lib'
import { CfnRole } from 'aws-cdk-lib/aws-iam'

const codeDeployServiceRole = (stack: CriStack) =>
  findOrCreate(
    stack,
    'CodeDeployServiceRole',
    (id) =>
      new CfnRole(stack, id, {
        assumeRolePolicyDocument: {
          Statement: [
            {
              Action: ['sts:AssumeRole'],
              Effect: 'Allow',
              Principal: { Service: ['codedeploy.amazonaws.com'] }
            }
          ],
          Version: '2012-10-17'
        },
        managedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambda'],
        permissionsBoundary: stack.permissionsBoundary
      })
  )

const useCanaryDeploymentAlarms = (stack: CriStack) =>
  findOrCreate(
    stack,
    'UseCanaryDeploymentAlarms',
    (id) =>
      new CfnCondition(stack, id, {
        expression: Fn.conditionAnd(
          stack.conditions.isDeployedFromPipeline,
          Fn.conditionNot(
            Fn.conditionEquals(stack.parameters.lambdaDeploymentPreference, 'AllAtOnce')
          )
        )
      })
  )

type CanaryAlarmConfig = Pick<
  CriAlarmConfig,
  'description' | 'dimensions' | 'metricName' | 'name' | 'namespace'
>

const canaryAlarm = (stack: CriStack, id: string, config: CanaryAlarmConfig) =>
  criAlarm(stack, id, {
    ...config,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    condition: useCanaryDeploymentAlarms(stack),
    datapointsToAlarm: 2,
    evaluationPeriods: 3,
    period: 60,
    severity: 'warning',
    statistic: 'Sum',
    threshold: 1,
    treatMissingData: 'notBreaching',
    unit: 'Count'
  })

const canaries = (stack: CriStack, fn: CriFunction, route: ApiRoute) => {
  const functionId = fn.resource.node.id
  return [
    canaryAlarm(stack, `${functionId}CanaryErrors`, {
      description: `Errors returned from ${functionId}`,
      dimensions: [
        { name: 'FunctionName', value: fn.name },
        { name: 'ExecutedVersion', value: fn.version }
      ],
      metricName: 'Errors',
      name: `${functionId}-canary-errors`,
      namespace: 'AWS/Lambda'
    }),
    canaryAlarm(stack, `${functionId}Canary5xxErrors`, {
      description: `5XX responses from ${route.method} ${route.path}`,
      dimensions: apiRouteDimensions(stack, route),
      metricName: '5XXError',
      name: `${functionId}-canary-5xx`,
      namespace: 'AWS/ApiGateway'
    })
  ]
}

export const criCanaryDeployment = (stack: CriStack, fn: CriFunction, route: ApiRoute) => {
  fn.resource.deploymentPreference = {
    alarms: Token.asList(
      Fn.conditionIf(
        useCanaryDeploymentAlarms(stack).logicalId,
        canaries(stack, fn, route).map((alarm) => alarm.ref),
        [Aws.NO_VALUE]
      )
    ),
    enabled: true,
    role: codeDeployServiceRole(stack).attrArn,
    type: stack.parameters.lambdaDeploymentPreference.valueAsString
  }
}
