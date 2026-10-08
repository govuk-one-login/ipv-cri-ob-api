import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type { Mock, MockInstance } from 'vitest'

import { createBaseHttpClient } from '@common/client/base-http-client'
import { EndpointProfile } from '@common/model/endpoint-profile'
import { logger } from '@govuk-one-login/cri-logger'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

const ACCESS_TOKEN = 'test-access-token'
const ENDPOINT = 'widgets'
const ENDPOINT_ORIGIN = 'https://third-party.test'
const ENDPOINT_URL = `${ENDPOINT_ORIGIN}/widgets`
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

const getRequest = {
  accessToken: ACCESS_TOKEN,
  profile: EndpointProfile.STUB,
  url: ENDPOINT_URL
}

const postJsonRequest = {
  accessToken: ACCESS_TOKEN,
  body: REQUEST_BODY,
  profile: EndpointProfile.STUB,
  url: ENDPOINT_URL
}

describe('createBaseHttpClient', () => {
  let infoSpy: MockInstance<typeof logger.info>

  beforeEach(() => {
    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('get', () => {
    it('sends a GET request with required headers and returns the parsed body', async () => {
      const fetchMock = stubFetch(vi.fn().mockResolvedValue(buildJsonResponse(200, RESPONSE_BODY)))
      const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

      await expect(httpClient.get(getRequest)).resolves.toEqual(RESPONSE_BODY)

      expect(fetchMock).toHaveBeenCalledOnce()
      expect(fetchMock).toHaveBeenCalledWith(ENDPOINT_URL, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${ACCESS_TOKEN}`
        },
        method: 'GET',
        signal: expect.any(AbortSignal)
      })
      expect(infoSpy).toHaveBeenCalledWith(`GET to ${ENDPOINT_ORIGIN} response status 200`)
    })

    it('logs only the origin of the url', async () => {
      stubFetch(vi.fn().mockResolvedValue(buildJsonResponse(200, RESPONSE_BODY)))
      const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

      await httpClient.get({ ...getRequest, url: `${ENDPOINT_URL}?sensitive=value` })

      expect(infoSpy).toHaveBeenCalledWith(`GET to ${ENDPOINT_ORIGIN} response status 200`)
    })

    it('throws for an unsuccessful status', async () => {
      stubFetch(vi.fn().mockResolvedValue(buildJsonResponse(503, { error: 'unavailable' })))
      const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

      await expect(httpClient.get(getRequest)).rejects.toThrow(
        'widgets response was not OK [HTTP code: 503] [endpoint profile: STUB]'
      )
    })

    it('throws for a response body that is not valid JSON', async () => {
      stubFetch(
        vi.fn().mockResolvedValue(
          new Response('not json', {
            headers: { 'content-type': 'application/json' },
            status: 200
          })
        )
      )
      const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

      await expect(httpClient.get(getRequest)).rejects.toThrow(SyntaxError)
    })

    it('propagates transport failures', async () => {
      const networkError = new TypeError('fetch failed')
      stubFetch(vi.fn().mockRejectedValue(networkError))
      const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

      await expect(httpClient.get(getRequest)).rejects.toBe(networkError)
    })
  })

  describe('postJson', () => {
    it('sends a POST request with required headers and returns the parsed body', async () => {
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
      expect(infoSpy).toHaveBeenCalledWith(`POST to ${ENDPOINT_ORIGIN} response status 201`)
    })

    it('throws for an unsuccessful status', async () => {
      stubFetch(vi.fn().mockResolvedValue(buildJsonResponse(503, { error: 'unavailable' })))
      const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

      await expect(httpClient.postJson(postJsonRequest)).rejects.toThrow(
        'widgets response was not OK [HTTP code: 503] [endpoint profile: STUB]'
      )
    })

    it('throws for a response body that is not valid JSON', async () => {
      stubFetch(
        vi.fn().mockResolvedValue(
          new Response('not json', {
            headers: { 'content-type': 'application/json' },
            status: 200
          })
        )
      )
      const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

      await expect(httpClient.postJson(postJsonRequest)).rejects.toThrow(SyntaxError)
    })

    it('propagates transport failures', async () => {
      const networkError = new TypeError('fetch failed')
      stubFetch(vi.fn().mockRejectedValue(networkError))
      const httpClient = createBaseHttpClient({ endpointName: ENDPOINT })

      await expect(httpClient.postJson(postJsonRequest)).rejects.toBe(networkError)
    })
  })
})
