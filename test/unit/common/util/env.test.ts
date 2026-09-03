import { requireEnv } from '@src/common/util/env'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const KEY = 'TEST_REQUIRE_ENV_VAR'

let originalValue: string | undefined

beforeEach(() => {
  originalValue = process.env[KEY]
})

afterEach(() => {
  if (originalValue === undefined) delete process.env[KEY]
  else process.env[KEY] = originalValue
})

describe('requireEnv', () => {
  it('returns the value when the env var is set', () => {
    process.env[KEY] = 'some-value'

    expect(requireEnv(KEY)).toBe('some-value')
  })

  it('throws when the env var is not set', () => {
    delete process.env[KEY]

    expect(() => requireEnv(KEY)).toThrow(`Required environment variable "${KEY}" is not set`)
  })

  it('throws when the env var is empty', () => {
    process.env[KEY] = ''

    expect(() => requireEnv(KEY)).toThrow(`Required environment variable "${KEY}" is not set`)
  })
})
