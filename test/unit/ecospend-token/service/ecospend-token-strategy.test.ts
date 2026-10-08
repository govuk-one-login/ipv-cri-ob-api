import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { TokenCredentials } from '@lib/token-rotator/model/token-credentials'

import { instrumentedFetch } from '@common/util/instrumented-fetch'
import { TokenRotationError } from '@lib/token-rotator/error/token-rotation-errors'
import { ecospendTokenStrategy } from '@src/ecospend-token/service/ecospend-token-strategy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW_SECONDS = 690_768_000 // 1991-11-22T00:00:00Z
const EXPIRES_IN_SECONDS = 3600

const TEST_PROFILE: EndpointProfile = 'STUB'

const CREDENTIALS: TokenCredentials = {
  'client-id': 'test-client-id',
  'client-secret': 'top-secret', // pragma: allowlist secret
  'endpoint-url': 'https://provider.test/token',
  'grant-type': 'client_credentials',
  scope: 'accounts'
}

const okResponse = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body), status: 200 }) as unknown as Response

const errorResponse = (status: number) => ({ status }) as unknown as Response

vi.mock('@common/util/instrumented-fetch', () => ({
  instrumentedFetch: vi.fn()
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW_SECONDS * 1000))
})

afterEach(() => {
  vi.useRealTimers()
  vi.mocked(instrumentedFetch).mockReset()
})

describe('ecospendTokenStrategy', () => {
  it('POSTs body and returns the token value with expires at', async () => {
    vi.mocked(instrumentedFetch).mockResolvedValue(
      okResponse({ access_token: 'fresh-token', expires_in: EXPIRES_IN_SECONDS })
    )

    const result = await ecospendTokenStrategy.rotate(TEST_PROFILE, CREDENTIALS)

    expect(result).toEqual({
      expiresAtSeconds: NOW_SECONDS + EXPIRES_IN_SECONDS,
      tokenValue: 'fresh-token'
    })
    expect(instrumentedFetch).toHaveBeenCalledOnce()
    expect(instrumentedFetch).toHaveBeenCalledWith(
      CREDENTIALS['endpoint-url'],
      expect.objectContaining({
        body: 'client_id=test-client-id&client_secret=top-secret&grant_type=client_credentials&scope=accounts',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        signal: expect.any(AbortSignal) as AbortSignal
      }),
      { endpoint: 'ecospend-token', profile: TEST_PROFILE }
    )
  })

  it('throws TokenRotationError when credentials fail validation', async () => {
    await expect(
      ecospendTokenStrategy.rotate(TEST_PROFILE, { ...CREDENTIALS, 'client-id': '' })
    ).rejects.toThrow(/Invalid Ecospend credentials:/)
    expect(instrumentedFetch).not.toHaveBeenCalled()
  })

  it('throws TokenRotationError when the server returns a non-200', async () => {
    vi.mocked(instrumentedFetch).mockResolvedValue(errorResponse(502))

    await expect(ecospendTokenStrategy.rotate(TEST_PROFILE, CREDENTIALS)).rejects.toThrow(
      new TokenRotationError('Ecospend returned 502')
    )
  })

  it('wraps fetch rejections as TokenRotationError', async () => {
    vi.mocked(instrumentedFetch).mockRejectedValue(new Error('crumbs'))

    await expect(ecospendTokenStrategy.rotate(TEST_PROFILE, CREDENTIALS)).rejects.toThrow(
      new TokenRotationError('Ecospend token request failed: crumbs')
    )
  })

  it('wraps non-JSON responses as TokenRotationError', async () => {
    vi.mocked(instrumentedFetch).mockResolvedValue({
      json: vi.fn().mockRejectedValue(new Error('Unexpected token <')),
      status: 200
    } as unknown as Response)

    await expect(ecospendTokenStrategy.rotate(TEST_PROFILE, CREDENTIALS)).rejects.toThrow(
      /Ecospend response was not valid JSON: Unexpected token </
    )
  })

  it('throws TokenRotationError when the response fails validation', async () => {
    vi.mocked(instrumentedFetch).mockResolvedValue(okResponse({ cool: 'beans' }))

    await expect(ecospendTokenStrategy.rotate(TEST_PROFILE, CREDENTIALS)).rejects.toThrow(
      /Unexpected Ecospend response:/
    )
  })
})
