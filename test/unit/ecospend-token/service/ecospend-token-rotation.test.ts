import type { ProviderCredentials } from '@src/token-rotator/model/provider-credentials'

import { ecospendTokenRotation } from '@src/ecospend-token/service/ecospend-token-rotation'
import { TokenRotationError } from '@src/token-rotator/error/token-rotation-errors'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW_SECONDS = 690_768_000 // 1991-11-22T00:00:00Z
const EXPIRES_IN_SECONDS = 3600

const CREDENTIALS: ProviderCredentials = {
  'client-id': 'test-client-id',
  'client-secret': 'top-secret', // pragma: allowlist secret
  'endpoint-url': 'https://provider.test/token',
  'grant-type': 'client_credentials',
  scope: 'accounts'
}

const okResponse = (body: unknown): Response =>
  ({ json: vi.fn().mockResolvedValue(body), status: 200 }) as unknown as Response

const errorResponse = (status: number): Response =>
  ({ json: vi.fn(), status }) as unknown as Response

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW_SECONDS * 1000))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ecospendTokenRotation.rotate', () => {
  it('POSTs form-encoded body and returns the token with absolute expiry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        access_token: 'fresh-token',
        expires_in: EXPIRES_IN_SECONDS
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await ecospendTokenRotation.rotate(CREDENTIALS)

    expect(result).toEqual({
      expiresAtSeconds: NOW_SECONDS + EXPIRES_IN_SECONDS,
      tokenValue: 'fresh-token'
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
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

  it('throws TokenRotationError when the credentials fail validation', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      ecospendTokenRotation.rotate({ ...CREDENTIALS, 'client-id': '' })
    ).rejects.toThrowError(/Invalid Ecospend credentials:/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws TokenRotationError when the upstream returns a non-200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(502)))

    await expect(ecospendTokenRotation.rotate(CREDENTIALS)).rejects.toThrowError(
      new TokenRotationError('Ecospend returned 502')
    )
  })

  it('wraps fetch rejections as TokenRotationError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(ecospendTokenRotation.rotate(CREDENTIALS)).rejects.toThrowError(
      new TokenRotationError('Ecospend token request failed: network down')
    )
  })

  it('wraps non-JSON response bodies as TokenRotationError', async () => {
    const response = {
      json: vi.fn().mockRejectedValue(new Error('Unexpected token <')),
      status: 200
    } as unknown as Response
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(ecospendTokenRotation.rotate(CREDENTIALS)).rejects.toThrowError(
      /Ecospend response was not valid JSON: Unexpected token </
    )
  })

  it('throws TokenRotationError when the response fails schema validation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okResponse({ access_token: '', expires_in: -1 }))
    )

    await expect(ecospendTokenRotation.rotate(CREDENTIALS)).rejects.toThrowError(
      /Invalid Ecospend response:/
    )
  })
})
