export const ThirdPartyResponseState = {
  RESPONSE_CODE_EXPECTED: 'response_code_expected',
  RESPONSE_CODE_UNEXPECTED: 'response_code_unexpected'
} as const

export type ThirdPartyResponseState =
  (typeof ThirdPartyResponseState)[keyof typeof ThirdPartyResponseState]

export const ThirdPartyRequestState = {
  SEND_OK: 'send_ok',
  SEND_ERROR: 'send_error',
  SEND_TIMEOUT: 'send_timeout'
} as const

export type ThirdPartyRequestState =
  (typeof ThirdPartyRequestState)[keyof typeof ThirdPartyRequestState]

export const ThirdPartyResponseBodyState = {
  RESPONSE_BODY_INVALID: 'response_body_invalid'
} as const

export type ThirdPartyResponseBodyState =
  (typeof ThirdPartyResponseBodyState)[keyof typeof ThirdPartyResponseBodyState]

export const ThirdPartyMetricDimensions = {
  ENDPOINT: 'endpoint_name',
  PROFILE: 'profile',
  RESPONSE_BODY_STATE: 'response_body_state',
  STATE: 'state',
  STATUS: 'status'
} as const

export const THIRD_PARTY_REQUEST_METRIC_NAME = 'third_party_request'
export const THIRD_PARTY_RESPONSE_METRIC_NAME = 'third_party_response'
export const THIRD_PARTY_RESPONSE_BODY_METRIC_NAME = 'third_party_response_body'
export const THIRD_PARTY_LATENCY_METRIC_NAME = 'third_party_latency_ms'
