import type { EndpointProfile } from '@common/model/endpoint-profile'

import {
  THIRD_PARTY_LATENCY_METRIC_NAME,
  THIRD_PARTY_REQUEST_METRIC_NAME,
  THIRD_PARTY_RESPONSE_METRIC_NAME,
  ThirdPartyMetricDimensions,
  ThirdPartyRequestState,
  ThirdPartyResponseState
} from '@common/model/metrics/third-party-metrics'
import { captureMetricWithDimensions, MetricUnit } from '@govuk-one-login/cri-metrics'

const DEFAULT_TIMEOUT_MS = 10_000

type ThirdPartyState = ThirdPartyRequestState | ThirdPartyResponseState

const instrumentedFetch = async (
  url: string,
  fetchOptions: RequestInit,
  metricContext: { endpoint: string; profile: EndpointProfile }
) => {
  const baseDimensions = {
    [ThirdPartyMetricDimensions.ENDPOINT]: metricContext.endpoint,
    [ThirdPartyMetricDimensions.PROFILE]: metricContext.profile
  }
  const captureCount = (
    name: string,
    state: ThirdPartyState,
    extraDimensions?: Record<string, string>
  ) =>
    captureMetricWithDimensions(
      name,
      { ...baseDimensions, [ThirdPartyMetricDimensions.STATE]: state, ...extraDimensions },
      1,
      MetricUnit.Count
    )
  const captureLatency = (state: ThirdPartyState, milliseconds: number) =>
    captureMetricWithDimensions(
      THIRD_PARTY_LATENCY_METRIC_NAME,
      { ...baseDimensions, [ThirdPartyMetricDimensions.STATE]: state },
      milliseconds,
      MetricUnit.Milliseconds
    )

  const start = performance.now()
  let response: Response

  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: fetchOptions.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    })
  } catch (err) {
    const failureLatency = performance.now() - start
    const requestState =
      err instanceof Error && err.name === 'TimeoutError'
        ? ThirdPartyRequestState.SEND_TIMEOUT
        : ThirdPartyRequestState.SEND_ERROR
    captureCount(THIRD_PARTY_REQUEST_METRIC_NAME, requestState)
    captureLatency(requestState, failureLatency)
    throw err
  }

  captureCount(THIRD_PARTY_REQUEST_METRIC_NAME, ThirdPartyRequestState.SEND_OK)

  const latency = performance.now() - start
  const responseState = response.ok
    ? ThirdPartyResponseState.RESPONSE_CODE_EXPECTED
    : ThirdPartyResponseState.RESPONSE_CODE_UNEXPECTED

  captureCount(THIRD_PARTY_RESPONSE_METRIC_NAME, responseState, {
    [ThirdPartyMetricDimensions.STATUS]: response.status.toString()
  })
  captureLatency(responseState, latency)

  return response
}

export { instrumentedFetch }
