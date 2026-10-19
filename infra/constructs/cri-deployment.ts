import type { CriAlarmConfig } from '@infra/constructs/cri-alarm'
import type { ApiBoundary } from '@infra/constructs/cri-api'
import type { CriStack } from '@infra/constructs/cri-stack'
import type { CfnFunction } from 'aws-cdk-lib/aws-sam'

import { criAlarm } from '@infra/constructs/cri-alarm'
import { apiName } from '@infra/constructs/cri-api'
import { Aws, Fn, Token } from 'aws-cdk-lib'
import { CfnRole } from 'aws-cdk-lib/aws-iam'

// the API route whose 5XX responses roll back the deployment
export type CanaryDeployment = {
  api: ApiBoundary
  method: 'GET' | 'POST'
  path: string
}

export const codeDeployServiceRole = (stack: CriStack) =>
  new CfnRole(stack, 'CodeDeployServiceRole', {
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

const canaryAlarm = (
  stack: CriStack,
  id: string,
  config: Pick<CriAlarmConfig, 'description' | 'dimensions' | 'metricName' | 'name' | 'namespace'>
) =>
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

const canaries = (stack: CriStack, functionId: string, route: CanaryDeployment) => [
  canaryAlarm(stack, `${functionId}CanaryErrors`, {
    description: `Errors returned from ${functionId}`,
    dimensions: [
      { name: 'FunctionName', value: Fn.ref(functionId) },
      {
        name: 'ExecutedVersion',
        value: Token.asString(Fn.getAtt(`${functionId}.Version`, 'Version'))
      }
    ],
    metricName: 'Errors',
    name: `${functionId}-canary-errors`,
    namespace: 'AWS/Lambda'
  }),
  canaryAlarm(stack, `${functionId}Canary5xxErrors`, {
    description: `5XX responses from ${route.method} ${route.path}`,
    dimensions: [
      { name: 'ApiName', value: apiName(stack, route.api) },
      { name: 'Method', value: route.method },
      { name: 'Resource', value: route.path },
      { name: 'Stage', value: stack.parameters.environment.valueAsString }
    ],
    metricName: '5XXError',
    name: `${functionId}-canary-5xx`,
    namespace: 'AWS/ApiGateway'
  })
]

export const canaryDeploymentPreference = (
  stack: CriStack,
  functionId: string,
  route: CanaryDeployment
): CfnFunction.DeploymentPreferenceProperty => ({
  alarms: Token.asList(
    Fn.conditionIf(
      stack.conditions.useCanaryDeploymentAlarms.logicalId,
      canaries(stack, functionId, route).map((alarm) => alarm.ref),
      [Aws.NO_VALUE]
    )
  ),
  enabled: true,
  role: stack.codeDeployServiceRole.attrArn,
  type: stack.parameters.lambdaDeploymentPreference.valueAsString
})
