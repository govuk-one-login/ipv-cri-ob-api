export const KmsSignResult = {
  ERROR: 'error',
  SUCCESS: 'success'
} as const
export type KmsSignResult = (typeof KmsSignResult)[keyof typeof KmsSignResult]

export const KmsSignMetricDimensions = {
  Result: 'result'
} as const

export const KMS_SIGN_LATENCY_METRIC_NAME = 'kms_sign_latency_ms'
