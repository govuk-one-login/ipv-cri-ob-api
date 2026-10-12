import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type { Mock } from 'vitest'

import { EndpointProfile } from '@common/model/endpoint-profile'
import { instrumentedFetch } from '@common/util/instrumented-fetch'
import { MetricUnit } from '@govuk-one-login/cri-metrics'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as criMetrics from '@govuk-one-login/cri-metrics'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

const ENDPOINT_NAME = 'widgets'
const ENDPOINT_URL = 'https://third-party.test/widgets'

const METRIC_CONTEXT = { endpointName: ENDPOINT_NAME, endpointProfile: EndpointProfile.LIVE }

const buildResponse = (status: number): Response => new Response('{}', { status })

const stubFetch = (fetchMock: Mock = vi.fn()): Mock => {
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const expectCount = (metricName: string, dimensions: Record<string, string>): void => {
  expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
    metricName,
    expect.objectContaining({
      endpoint_name: ENDPOINT_NAME,
      endpoint_profile: EndpointProfile.LIVE,
      ...dimensions
    }),
    1,
    MetricUnit.Count
  )
}

const expectLatency = (state: string): void => {
  expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
    'third_party_latency_ms',
    expect.objectContaining({
      endpoint_name: ENDPOINT_NAME,
      endpoint_profile: EndpointProfile.LIVE,
      state: state
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

    expectCount('third_party_request', {
      state: 'send_ok'
    })
    expectCount('third_party_response', {
      state: 'response_code_expected',
      status: '200'
    })
    expectLatency('response_code_expected')
  })

  it('records an unexpected response code', async () => {
    const response = buildResponse(503)
    stubFetch(vi.fn().mockResolvedValue(response))

    await expect(instrumentedFetch(ENDPOINT_URL, { method: 'GET' }, METRIC_CONTEXT)).resolves.toBe(
      response
    )

    expectCount('third_party_request', {
      state: 'send_ok'
    })
    expectCount('third_party_response', {
      state: 'response_code_unexpected',
      status: '503'
    })
    expectLatency('response_code_unexpected')
  })

  it('records a timeout and throws', async () => {
    const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    stubFetch(vi.fn().mockRejectedValue(timeout))

    await expect(instrumentedFetch(ENDPOINT_URL, { method: 'GET' }, METRIC_CONTEXT)).rejects.toBe(
      timeout
    )

    expectCount('third_party_request', {
      state: 'send_timeout'
    })
    expectLatency('send_timeout')
    expect(criMetrics.captureMetricWithDimensions).not.toHaveBeenCalledWith(
      'third_party_response',
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

    expectCount('third_party_request', {
      state: 'send_error'
    })
    expectLatency('send_error')
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
