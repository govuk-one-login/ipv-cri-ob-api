import { MessageType } from '@aws-sdk/client-kms'

export const KmsSignResult = {
  ERROR: 'error',
  SUCCESS: 'success'
} as const
export type KmsSignResult = (typeof KmsSignResult)[keyof typeof KmsSignResult]

export const KmsSignMessageType = {
  DIGEST: 'digest',
  RAW: 'raw'
} as const
export type KmsSignMessageType = (typeof KmsSignMessageType)[keyof typeof KmsSignMessageType]

export const KmsSignMetricDimensions = {
  MessageType: 'message_type',
  Result: 'result'
} as const

export const KMS_SIGN_LATENCY_METRIC_NAME = 'kms_sign_latency_ms'

export const toMessageTypeDimension = (messageType: MessageType): KmsSignMessageType =>
  messageType === MessageType.RAW ? KmsSignMessageType.RAW : KmsSignMessageType.DIGEST
