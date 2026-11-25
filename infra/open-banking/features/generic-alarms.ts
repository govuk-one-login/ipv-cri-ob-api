import type { CriApi } from '@infra/cri/api/api'
import type { CriStack } from '@infra/cri/stack'

import { criAlarm } from '@infra/cri/alarm'
import { Fn } from 'aws-cdk-lib'

type GenericAlarmsCollaborators = {
  apis: Record<string, CriApi>
}

export const genericAlarms = (stack: CriStack, collaborators: GenericAlarmsCollaborators) => {
  criAlarm(stack, 'APIGW5XXErrors', {
    comparisonOperator: 'GreaterThanThreshold',
    condition: stack.conditions.isDeployedFromPipeline,
    datapointsToAlarm: 3,
    description: Fn.sub(`${stack.criName} \${Environment} API Gateway 5XX errors`),
    evaluationPeriods: 3,
    metrics: [
      { expression: 'SUM(METRICS())', id: 'total', label: 'Total 5XX errors', returnData: true },
      ...Object.entries(collaborators.apis).map(([id, api]) => ({
        id,
        metricStat: {
          metric: {
            dimensions: [{ name: 'ApiName', value: api.name }],
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
