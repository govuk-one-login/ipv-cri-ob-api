import { TokenProfile } from '@src/token-rotator/model/token-profile'
import { loadTokenRotatorConfigFromEnv } from '@src/token-rotator/util/load-config-from-env'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const ENV_KEYS = [
  'TOKEN_ROTATOR_PROFILES',
  'TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS',
  'TOKEN_ROTATOR_CONFIG_PATH'
] as const

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
  it('parses a pipe-delimited profile list, refresh window, and config path', () => {
    setEnv({
      TOKEN_ROTATOR_CONFIG_PATH: '/test/token-rotator',
      TOKEN_ROTATOR_PROFILES: 'STUB | UAT',
      TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS: '300'
    })

    expect(loadTokenRotatorConfigFromEnv()).toEqual({
      configPathPrefix: '/test/token-rotator',
      profiles: [TokenProfile.STUB, TokenProfile.UAT],
      refreshWindowSeconds: 300
    })
  })

  it('rejects an unknown profile name', () => {
    setEnv({
      TOKEN_ROTATOR_CONFIG_PATH: '/test/token-rotator',
      TOKEN_ROTATOR_PROFILES: 'STUB|BOGUS',
      TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS: '300'
    })

    expect(() => loadTokenRotatorConfigFromEnv()).toThrow(/Unknown profile\(s\): BOGUS/)
  })

  it('rejects a non-positive refresh window', () => {
    setEnv({
      TOKEN_ROTATOR_CONFIG_PATH: '/test/token-rotator',
      TOKEN_ROTATOR_PROFILES: 'STUB',
      TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS: '0'
    })

    expect(() => loadTokenRotatorConfigFromEnv()).toThrow(/positive number/)
  })

  it('rejects a missing required env var', () => {
    setEnv({
      TOKEN_ROTATOR_PROFILES: 'STUB',
      TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS: '300'
    })

    expect(() => loadTokenRotatorConfigFromEnv()).toThrow(/TOKEN_ROTATOR_CONFIG_PATH/)
  })
})
