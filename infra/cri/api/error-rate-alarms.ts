import type { AlarmSeverity } from '@infra/cri/alarm'
import type { ApiRoute } from '@infra/cri/api/api'
import type { CriStack } from '@infra/cri/stack'

import { criAlarm } from '@infra/cri/alarm'
import { apiRouteDimensions } from '@infra/cri/api/api'

type ErrorRateAlarmConfig = {
  severity: AlarmSeverity
  threshold: number // percentage of requests
}

const errorRateAlarm = (
  stack: CriStack,
  id: string,
  route: ApiRoute,
  config: ErrorRateAlarmConfig
) => {
  const { severity, threshold } = config
  const metric = (metricName: string) => ({
    dimensions: apiRouteDimensions(stack, route),
    metricName,
    namespace: 'AWS/ApiGateway'
  })

  const severityId = severity.charAt(0).toUpperCase() + severity.slice(1)

  return criAlarm(stack, `${id}5xxErrorRate${severityId}Alarm`, {
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    condition: stack.conditions.isDeployedFromPipeline,
    datapointsToAlarm: 2,
    description: `5XX error rate from ${route.method} ${route.path} exceeds ${threshold.toString()}%.`,
    evaluationPeriods: 5,
    metrics: [
      {
        expression: 'IF(requests < 5 || errors < 2, 0, errorPercentage)', // ignore the rate until there's meaningful traffic
        id: 'errorThreshold',
        label: 'errorThreshold',
        returnData: true
      },
      {
        id: 'requests',
        metricStat: { metric: metric('Count'), period: 60, stat: 'Sum' },
        returnData: false
      },
      {
        expression: '(errors / requests) * 100',
        id: 'errorPercentage',
        label: 'errorPercentage',
        returnData: false
      },
      {
        id: 'errors',
        metricStat: { metric: metric('5XXError'), period: 60, stat: 'Sum' },
        returnData: false
      }
    ],
    name: `${id}-5xx-error-rate-${severity}`,
    severity,
    threshold,
    treatMissingData: 'notBreaching'
  })
}

export const criApiErrorRateAlarms = (stack: CriStack, id: string, route: ApiRoute) => [
  errorRateAlarm(stack, id, route, { severity: 'warning', threshold: 20 }),
  errorRateAlarm(stack, id, route, { severity: 'critical', threshold: 80 })
]
