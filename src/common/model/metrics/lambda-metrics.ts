export const LambdaResult = {
  ERROR: 'error',
  SUCCESS: 'success'
} as const
export type LambdaResult = (typeof LambdaResult)[keyof typeof LambdaResult]

export const LambdaStartState = {
  COLD: 'cold',
  HOT: 'hot'
} as const
export type LambdaStartState = (typeof LambdaStartState)[keyof typeof LambdaStartState]

export const LambdaMetricDimensions = {
  Lambda: 'lambda',
  Result: 'result',
  StartState: 'start_state'
} as const

export const LAMBDA_RESULT_METRIC_NAME = 'lambda_result'
export const LAMBDA_LATENCY_METRIC_NAME = 'lambda_latency_ms'
