import type { ApiBoundary } from '@infra/constructs/cri-api'
import type { CriStack } from '@infra/constructs/cri-stack'

import { criAlarm } from '@infra/constructs/cri-alarm'
import { apiName } from '@infra/constructs/cri-api'
import { Fn } from 'aws-cdk-lib'

const apiBoundaries: ApiBoundary[] = ['public', 'private']

export const genericAlarms = (stack: CriStack) => {
  criAlarm(stack, 'APIGW5XXErrors', {
    comparisonOperator: 'GreaterThanThreshold',
    condition: stack.conditions.isDeployedFromPipeline,
    datapointsToAlarm: 3,
    description: Fn.sub(`${stack.criName} \${Environment} API Gateway 5XX errors`),
    evaluationPeriods: 3,
    metrics: [
      { expression: 'SUM(METRICS())', id: 'total', label: 'Total 5XX errors', returnData: true },
      ...apiBoundaries.map((boundary) => ({
        id: boundary,
        metricStat: {
          metric: {
            dimensions: [{ name: 'ApiName', value: apiName(stack, boundary) }],
            metricName: '5XXError',
            namespace: 'AWS/ApiGateway'
          },
          period: 300,
          stat: 'Sum'
        },
        returnData: false
      }))
    ],
    name: 'api-gateway-5xx-errors',
    severity: 'page',
    threshold: 1,
    treatMissingData: 'notBreaching'
  })

  criAlarm(stack, 'LambdaErrors', {
    comparisonOperator: 'GreaterThanThreshold',
    condition: stack.conditions.isDeployedFromPipeline,
    datapointsToAlarm: 3,
    description: Fn.sub(`${stack.criName} \${Environment} lambda errors`),
    dimensions: [],
    evaluationPeriods: 3,
    metricName: 'Errors',
    name: 'lambda-errors',
    namespace: 'AWS/Lambda',
    period: 300,
    severity: 'page',
    statistic: 'Sum',
    threshold: 1,
    treatMissingData: 'notBreaching'
  })
}
