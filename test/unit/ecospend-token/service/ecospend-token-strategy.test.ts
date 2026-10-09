import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type { TokenCredentials } from '@govuk-one-login/cri-token-rotator'
import type { Mock } from 'vitest'

import { EndpointProfile } from '@common/model/endpoint-profile'
import { EcospendTokenError } from '@src/ecospend-token/error/ecospend-token-error'
import { ecospendTokenStrategy } from '@src/ecospend-token/service/ecospend-token-strategy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

const NOW_SECONDS = 690_768_000 // 1991-11-22T00:00:00Z
const EXPIRES_IN_SECONDS = 3600

const CREDENTIALS: TokenCredentials = {
  'client-id': 'test-client-id',
  'client-secret': 'top-secret', // pragma: allowlist secret
  'endpoint-url': 'https://provider.test/token',
  'grant-type': 'client_credentials',
  scope: 'accounts'
}

const PROFILE = EndpointProfile.STUB

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status
  })

const stubFetch = (mock: Mock = vi.fn()): Mock => {
  vi.stubGlobal('fetch', mock)
  return mock
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW_SECONDS * 1000))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ecospendTokenStrategy', () => {
  it('POSTs body and returns the token value with expires at', async () => {
    const fetch = stubFetch(
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(200, { access_token: 'fresh-token', expires_in: EXPIRES_IN_SECONDS })
        )
    )

    const result = await ecospendTokenStrategy.rotate(PROFILE, CREDENTIALS)

    expect(result).toEqual({
      expiresAtSeconds: NOW_SECONDS + EXPIRES_IN_SECONDS,
      tokenValue: 'fresh-token'
    })
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith(
      CREDENTIALS['endpoint-url'],
      expect.objectContaining({
        body: 'client_id=test-client-id&client_secret=top-secret&grant_type=client_credentials&scope=accounts',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        signal: expect.any(AbortSignal) as AbortSignal
      })
    )
  })

  it('throws when credentials fail validation', async () => {
    const fetch = stubFetch()
    const { 'client-id': _clientId, ...credentialsWithoutClientId } = CREDENTIALS

    const rotation = ecospendTokenStrategy.rotate(PROFILE, credentialsWithoutClientId)

    await expect(rotation).rejects.toBeInstanceOf(EcospendTokenError)
    await expect(rotation).rejects.toThrow(
      'Ecospend token error: problem parsing credentials: client-id: Invalid input: expected string, received undefined [endpoint profile: STUB]'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws EcospendIamError when the response is not OK', async () => {
    stubFetch(vi.fn().mockResolvedValue(jsonResponse(502, {})))

    const rotation = ecospendTokenStrategy.rotate(PROFILE, CREDENTIALS)

    await expect(rotation).rejects.toBeInstanceOf(EcospendTokenError)
    await expect(rotation).rejects.toThrow(
      'Ecospend token error: response was not OK [status: 502] [endpoint profile: STUB]'
    )
  })

  it('throws EcospendIamError when the response is not valid JSON', async () => {
    stubFetch(vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })))

    const rotation = ecospendTokenStrategy.rotate(PROFILE, CREDENTIALS)

    await expect(rotation).rejects.toBeInstanceOf(EcospendTokenError)
    await expect(rotation).rejects.toThrow(
      'Ecospend token error: response was not valid JSON [endpoint profile: STUB]'
    )
  })

  it('throws EcospendIamError when the response cannot be parsed', async () => {
    stubFetch(vi.fn().mockResolvedValue(jsonResponse(200, { cool: 'beans' })))

    const rotation = ecospendTokenStrategy.rotate(PROFILE, CREDENTIALS)

    await expect(rotation).rejects.toBeInstanceOf(EcospendTokenError)
    await expect(rotation).rejects.toThrow(
      /^Ecospend token error: problem parsing response: access_token: .+; expires_in: .+ \[endpoint profile: STUB]$/
    )
  })

  it('propagates fetch rejections', async () => {
    stubFetch(vi.fn().mockRejectedValue(new Error('crumbs')))

    const rotation = ecospendTokenStrategy.rotate(PROFILE, CREDENTIALS)

    await expect(rotation).rejects.toBeInstanceOf(EcospendTokenError)
    await expect(rotation).rejects.toThrow(
      /^Ecospend token error: crumbs \[endpoint profile: STUB]$/
    )
  })
})
