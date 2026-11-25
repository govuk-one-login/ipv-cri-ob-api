import type { CriFunction } from '@infra/cri/function'

export type LambdaResult = 'error' | 'success'

export const lambdaResultMetric = (fn: CriFunction, result: LambdaResult) => ({
  dimensions: [
    { name: 'service', value: fn.serviceName },
    { name: 'lambda', value: fn.name },
    { name: 'result', value: result }
  ],
  metricName: 'lambda_result',
  namespace: fn.metricsNamespace
})
