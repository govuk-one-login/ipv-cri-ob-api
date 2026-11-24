import type { CriAlarmConfig } from '@infra/cri/alarm'
import type { ApiRoute } from '@infra/cri/api/api'
import type { CriStack } from '@infra/cri/stack'
import type { CfnFunction } from 'aws-cdk-lib/aws-sam'

import { criAlarm } from '@infra/cri/alarm'
import { functionVersionNumber } from '@infra/cri/sam'
import { Aws, Fn, Token } from 'aws-cdk-lib'
import { CfnRole } from 'aws-cdk-lib/aws-iam'

const codeDeployServiceRoleId = 'CodeDeployServiceRole'

const codeDeployServiceRole = (stack: CriStack) =>
  (stack.node.tryFindChild(codeDeployServiceRoleId) as CfnRole | undefined) ??
  new CfnRole(stack, codeDeployServiceRoleId, {
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

type CanaryAlarmConfig = Pick<
  CriAlarmConfig,
  'description' | 'dimensions' | 'metricName' | 'name' | 'namespace'
>

const canaryAlarm = (stack: CriStack, id: string, config: CanaryAlarmConfig) =>
  criAlarm(stack, id, {
    ...config,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    condition: stack.conditions.useCanaryDeploymentAlarms,
    datapointsToAlarm: 2,
    evaluationPeriods: 3,
    period: 60,
    severity: 'warning',
    statistic: 'Sum',
    threshold: 1,
    treatMissingData: 'notBreaching',
    unit: 'Count'
  })

const canaries = (stack: CriStack, fn: CfnFunction, route: ApiRoute) => {
  const functionId = fn.node.id
  return [
    canaryAlarm(stack, `${functionId}CanaryErrors`, {
      description: `Errors returned from ${functionId}`,
      dimensions: [
        { name: 'FunctionName', value: fn.ref },
        { name: 'ExecutedVersion', value: functionVersionNumber(fn) }
      ],
      metricName: 'Errors',
      name: `${functionId}-canary-errors`,
      namespace: 'AWS/Lambda'
    }),
    canaryAlarm(stack, `${functionId}Canary5xxErrors`, {
      description: `5XX responses from ${route.method} ${route.path}`,
      dimensions: [
        { name: 'ApiName', value: route.api.name },
        { name: 'Method', value: route.method },
        { name: 'Resource', value: route.path },
        { name: 'Stage', value: stack.parameters.environment.valueAsString }
      ],
      metricName: '5XXError',
      name: `${functionId}-canary-5xx`,
      namespace: 'AWS/ApiGateway'
    })
  ]
}

export const criCanaryDeployment = (stack: CriStack, fn: CfnFunction, route: ApiRoute) => {
  fn.deploymentPreference = {
    alarms: Token.asList(
      Fn.conditionIf(
        stack.conditions.useCanaryDeploymentAlarms.logicalId,
        canaries(stack, fn, route).map((alarm) => alarm.ref),
        [Aws.NO_VALUE]
      )
    ),
    enabled: true,
    role: codeDeployServiceRole(stack).attrArn,
    type: stack.parameters.lambdaDeploymentPreference.valueAsString
  }
}
