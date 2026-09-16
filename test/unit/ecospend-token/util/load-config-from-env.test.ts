import { EndpointProfile } from '@common/model/endpoint-profile'
import { loadTokenRotatorConfigFromEnv } from '@src/ecospend-token/util/load-config-from-env'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const ENV_KEYS = ['ENDPOINT_PROFILES', 'TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS'] as const

const setEnv = (overrides: Partial<Record<(typeof ENV_KEYS)[number], string>>): void => {
  for (const key of ENV_KEYS) {
    if (overrides[key] === undefined) delete process.env[key]
    else process.env[key] = overrides[key]
  }
}

const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key]
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
})

describe('loadTokenRotatorConfigFromEnv', () => {
  it('parses required env vars', () => {
    setEnv({
      ENDPOINT_PROFILES: 'STUB | UAT',
      TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS: '300'
    })

    expect(loadTokenRotatorConfigFromEnv()).toEqual({
      profiles: [EndpointProfile.STUB, EndpointProfile.UAT],
      refreshWindowSeconds: 300
    })
  })

  it('rejects a missing required env var', () => {
    setEnv({
      ENDPOINT_PROFILES: 'STUB'
    })

    expect(() => loadTokenRotatorConfigFromEnv()).toThrow(
      'Required environment variable "TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS" is not set'
    )
  })
})
