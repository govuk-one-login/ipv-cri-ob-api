import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type { Mock } from 'vitest'

import { createBaseHttpClient } from '@common/client/base-http-client'
import { EndpointProfile } from '@common/model/endpoint-profile'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

const ACCESS_TOKEN = 'test-access-token'
const ENDPOINT = 'widgets'
const ENDPOINT_URL = 'https://third-party.test/widgets'
const REQUEST_BODY = { widget_id: 'a-widget' }
const RESPONSE_BODY = { id: 'widget-1' }

const stubFetch = (fetchMock: Mock): Mock => {
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const buildJsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status
  })

const postJsonRequest = {
  accessToken: ACCESS_TOKEN,
  body: REQUEST_BODY,
  profile: EndpointProfile.STUB,
  url: ENDPOINT_URL
}

describe('createBaseHttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('posts JSON request with required headers and returns the parsed body', async () => {
    const fetchMock = stubFetch(vi.fn().mockResolvedValue(buildJsonResponse(201, RESPONSE_BODY)))
    const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

    await expect(httpClient.postJson(postJsonRequest)).resolves.toEqual(RESPONSE_BODY)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      ENDPOINT_URL,
      expect.objectContaining({
        body: JSON.stringify(REQUEST_BODY),
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${ACCESS_TOKEN}`,
          'content-type': 'application/json'
        },
        method: 'POST'
      })
    )
  })

  it('throws for an unsuccessful status', async () => {
    stubFetch(vi.fn().mockResolvedValue(buildJsonResponse(503, { error: 'unavailable' })))
    const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

    await expect(httpClient.postJson(postJsonRequest)).rejects.toThrow(
      'widgets response was not OK [HTTP code: 503] [endpoint profile: STUB]'
    )
  })

  it('propagates transport failures', async () => {
    const networkError = new TypeError('fetch failed')
    stubFetch(vi.fn().mockRejectedValue(networkError))
    const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

    await expect(httpClient.postJson(postJsonRequest)).rejects.toBe(networkError)
  })
})
