import type { EndpointProfile } from '@common/model/endpoint-profile'

import { captureMetricWithDimensions } from '@govuk-one-login/cri-metrics'

export const BankListMetricDimensions = {
  ENDPOINT_PROFILE: 'endpoint_profile'
} as const

export const BANK_LIST_SIZE_METRIC_NAME = 'bank_list_size'
export const BANK_LIST_UPDATED_METRIC_NAME = 'bank_list_updated'

export const emitBankListSize = (args: { profile: EndpointProfile; size: number }) =>
  captureMetricWithDimensions(
    BANK_LIST_SIZE_METRIC_NAME,
    {
      [BankListMetricDimensions.ENDPOINT_PROFILE]: args.profile
    },
    args.size
  )

export const emitBankListUpdated = (args: { profile: EndpointProfile }) =>
  captureMetricWithDimensions(BANK_LIST_UPDATED_METRIC_NAME, {
    [BankListMetricDimensions.ENDPOINT_PROFILE]: args.profile
  })
