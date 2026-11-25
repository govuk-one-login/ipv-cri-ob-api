import type { CriFunction } from '@infra/cri/function'
import type { CriStack } from '@infra/cri/stack'

import { criAlarm } from '@infra/cri/alarm'

export const criThrottleAlarm = (stack: CriStack, fn: CriFunction) => {
  const functionId = fn.resource.node.id

  return criAlarm(stack, `${functionId}ThrottleAlarm`, {
    comparisonOperator: 'GreaterThanThreshold',
    condition: stack.conditions.isDeployedFromPipeline,
    datapointsToAlarm: 1,
    description: `${functionId} is being throttled.`,
    dimensions: [{ name: 'FunctionName', value: fn.name }],
    evaluationPeriods: 1,
    metricName: 'Throttles',
    name: `${functionId}-throttled`,
    namespace: 'AWS/Lambda',
    period: 60,
    severity: 'warning',
    statistic: 'Sum',
    threshold: 1,
    treatMissingData: 'notBreaching'
  })
}
