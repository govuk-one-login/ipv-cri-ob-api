import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type { Mock } from 'vitest'

import { EndpointProfile } from '@common/model/endpoint-profile'
import {
  THIRD_PARTY_LATENCY_METRIC_NAME,
  THIRD_PARTY_REQUEST_METRIC_NAME,
  THIRD_PARTY_RESPONSE_METRIC_NAME,
  ThirdPartyMetricDimensions,
  ThirdPartyRequestState,
  ThirdPartyResponseState
} from '@common/model/metrics/third-party-metrics'
import { instrumentedFetch } from '@common/util/instrumented-fetch'
import { MetricUnit } from '@govuk-one-login/cri-metrics'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as criMetrics from '@govuk-one-login/cri-metrics'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

const ENDPOINT = 'widgets'
const ENDPOINT_URL = 'https://third-party.test/widgets'

const METRIC_CONTEXT = { endpoint: ENDPOINT, profile: EndpointProfile.LIVE }

const buildResponse = (status: number): Response => new Response('{}', { status })

const stubFetch = (fetchMock: Mock = vi.fn()): Mock => {
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const expectCount = (metricName: string, dimensions: Record<string, string>): void => {
  expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
    metricName,
    expect.objectContaining({
      [ThirdPartyMetricDimensions.ENDPOINT]: ENDPOINT,
      [ThirdPartyMetricDimensions.PROFILE]: EndpointProfile.LIVE,
      ...dimensions
    }),
    1,
    MetricUnit.Count
  )
}

const expectLatency = (state: string): void => {
  expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
    THIRD_PARTY_LATENCY_METRIC_NAME,
    expect.objectContaining({
      [ThirdPartyMetricDimensions.ENDPOINT]: ENDPOINT,
      [ThirdPartyMetricDimensions.PROFILE]: EndpointProfile.LIVE,
      [ThirdPartyMetricDimensions.STATE]: state
    }),
    expect.any(Number),
    MetricUnit.Milliseconds
  )
}

describe('instrumentedFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('returns a response and records a successful request', async () => {
    const response = buildResponse(200)
    stubFetch(vi.fn().mockResolvedValue(response))

    await expect(instrumentedFetch(ENDPOINT_URL, { method: 'POST' }, METRIC_CONTEXT)).resolves.toBe(
      response
    )

    expectCount(THIRD_PARTY_REQUEST_METRIC_NAME, {
      [ThirdPartyMetricDimensions.STATE]: ThirdPartyRequestState.SEND_OK
    })
    expectCount(THIRD_PARTY_RESPONSE_METRIC_NAME, {
      [ThirdPartyMetricDimensions.STATE]: ThirdPartyResponseState.RESPONSE_CODE_EXPECTED,
      [ThirdPartyMetricDimensions.STATUS]: '200'
    })
    expectLatency(ThirdPartyResponseState.RESPONSE_CODE_EXPECTED)
  })

  it('records an unexpected response code', async () => {
    const response = buildResponse(503)
    stubFetch(vi.fn().mockResolvedValue(response))

    await expect(instrumentedFetch(ENDPOINT_URL, { method: 'GET' }, METRIC_CONTEXT)).resolves.toBe(
      response
    )

    expectCount(THIRD_PARTY_REQUEST_METRIC_NAME, {
      [ThirdPartyMetricDimensions.STATE]: ThirdPartyRequestState.SEND_OK
    })
    expectCount(THIRD_PARTY_RESPONSE_METRIC_NAME, {
      [ThirdPartyMetricDimensions.STATE]: ThirdPartyResponseState.RESPONSE_CODE_UNEXPECTED,
      [ThirdPartyMetricDimensions.STATUS]: '503'
    })
    expectLatency(ThirdPartyResponseState.RESPONSE_CODE_UNEXPECTED)
  })

  it('records a timeout and throws', async () => {
    const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    stubFetch(vi.fn().mockRejectedValue(timeout))

    await expect(instrumentedFetch(ENDPOINT_URL, { method: 'GET' }, METRIC_CONTEXT)).rejects.toBe(
      timeout
    )

    expectCount(THIRD_PARTY_REQUEST_METRIC_NAME, {
      [ThirdPartyMetricDimensions.STATE]: ThirdPartyRequestState.SEND_TIMEOUT
    })
    expectLatency(ThirdPartyRequestState.SEND_TIMEOUT)
    expect(criMetrics.captureMetricWithDimensions).not.toHaveBeenCalledWith(
      THIRD_PARTY_RESPONSE_METRIC_NAME,
      expect.anything(),
      expect.anything(),
      expect.anything()
    )
  })

  it('records a send error and throws', async () => {
    const networkError = new TypeError('fetch failed')
    stubFetch(vi.fn().mockRejectedValue(networkError))

    await expect(instrumentedFetch(ENDPOINT_URL, { method: 'GET' }, METRIC_CONTEXT)).rejects.toBe(
      networkError
    )

    expectCount(THIRD_PARTY_REQUEST_METRIC_NAME, {
      [ThirdPartyMetricDimensions.STATE]: ThirdPartyRequestState.SEND_ERROR
    })
    expectLatency(ThirdPartyRequestState.SEND_ERROR)
  })

  it('applies a ten second timeout signal when signal is omitted from options', async () => {
    const timeoutSignal = vi.spyOn(AbortSignal, 'timeout')
    const fetchMock = stubFetch(vi.fn().mockResolvedValue(buildResponse(200)))

    await instrumentedFetch(ENDPOINT_URL, { method: 'POST' }, METRIC_CONTEXT)

    expect(timeoutSignal).toHaveBeenCalledWith(10_000)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      ENDPOINT_URL,
      expect.objectContaining({ method: 'POST', signal: timeoutSignal.mock.results[0]?.value })
    )
  })

  it('overrides the default signal when one is provided', async () => {
    const timeoutSignal = vi.spyOn(AbortSignal, 'timeout')
    const fetchMock = stubFetch(vi.fn().mockResolvedValue(buildResponse(200)))
    const abortController = new AbortController()

    await instrumentedFetch(
      ENDPOINT_URL,
      { method: 'GET', signal: abortController.signal },
      METRIC_CONTEXT
    )

    expect(timeoutSignal).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      ENDPOINT_URL,
      expect.objectContaining({ method: 'GET', signal: abortController.signal })
    )
  })
})
