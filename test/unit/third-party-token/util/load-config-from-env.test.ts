import { ConfigProfileName } from '@src/third-party-token/model/config-profile'
import { loadTokenRotatorConfigFromEnv } from '@src/third-party-token/util/load-config-from-env'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const ENV_KEYS = [
  'THIRD_PARTY_TOKEN_PROFILES',
  'THIRD_PARTY_TOKEN_REFRESH_WINDOW_SECONDS',
  'THIRD_PARTY_TOKEN_CONFIG_SSM_PATH'
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
  it('parses a pipe-delimited profile list, refresh window, and ssm path', () => {
    setEnv({
      THIRD_PARTY_TOKEN_CONFIG_SSM_PATH: '/test/third-party-tokens',
      THIRD_PARTY_TOKEN_PROFILES: 'STUB | UAT',
      THIRD_PARTY_TOKEN_REFRESH_WINDOW_SECONDS: '300'
    })

    expect(loadTokenRotatorConfigFromEnv()).toEqual({
      profiles: [ConfigProfileName.STUB, ConfigProfileName.UAT],
      refreshWindowSeconds: 300,
      ssmPathPrefix: '/test/third-party-tokens'
    })
  })

  it('rejects an unknown profile name', () => {
    setEnv({
      THIRD_PARTY_TOKEN_CONFIG_SSM_PATH: '/test/third-party-tokens',
      THIRD_PARTY_TOKEN_PROFILES: 'STUB|BOGUS',
      THIRD_PARTY_TOKEN_REFRESH_WINDOW_SECONDS: '300'
    })

    expect(() => loadTokenRotatorConfigFromEnv()).toThrow(/Unknown profile\(s\): BOGUS/)
  })

  it('rejects a non-positive refresh window', () => {
    setEnv({
      THIRD_PARTY_TOKEN_CONFIG_SSM_PATH: '/test/third-party-tokens',
      THIRD_PARTY_TOKEN_PROFILES: 'STUB',
      THIRD_PARTY_TOKEN_REFRESH_WINDOW_SECONDS: '0'
    })

    expect(() => loadTokenRotatorConfigFromEnv()).toThrow(/positive number/)
  })

  it('rejects a missing required env var', () => {
    setEnv({
      THIRD_PARTY_TOKEN_PROFILES: 'STUB',
      THIRD_PARTY_TOKEN_REFRESH_WINDOW_SECONDS: '300'
    })

    expect(() => loadTokenRotatorConfigFromEnv()).toThrow(/THIRD_PARTY_TOKEN_CONFIG_SSM_PATH/)
  })
})
