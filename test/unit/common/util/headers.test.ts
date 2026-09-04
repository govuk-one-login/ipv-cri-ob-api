import { UnauthorisedError } from '@common/error/unauthorised-error'
import { requireBearerToken, requireSessionId } from '@src/common/util/headers'
import { describe, expect, it } from 'vitest'

describe('requireSessionId', () => {
  it('returns session id when header is set', () => {
    const id = crypto.randomUUID()
    expect(requireSessionId(id)).toBe(id)
  })

  it('trims whitespace', () => {
    expect(requireSessionId('  abc  ')).toBe('abc')
  })

  it('throws UnauthorisedError when header is undefined', () => {
    expect(() => requireSessionId(undefined)).toThrow(UnauthorisedError)
  })

  it('throws UnauthorisedError when header is empty', () => {
    expect(() => requireSessionId('')).toThrow(UnauthorisedError)
  })

  it('throws UnauthorisedError when header is only whitespace', () => {
    expect(() => requireSessionId('   ')).toThrow(UnauthorisedError)
  })
})

describe('requireBearerToken', () => {
  it('returns bearer token when header is well-formed', () => {
    expect(requireBearerToken('Bearer abc123')).toBe('abc123')
  })

  it('trims whitespace around token', () => {
    expect(requireBearerToken('Bearer   abc123   ')).toBe('abc123')
  })

  it('throws UnauthorisedError when header is undefined', () => {
    expect(() => requireBearerToken(undefined)).toThrow(UnauthorisedError)
  })

  it('throws UnauthorisedError when header is empty', () => {
    expect(() => requireBearerToken('')).toThrow(UnauthorisedError)
  })

  it('throws UnauthorisedError when header does not start with "Bearer "', () => {
    expect(() => requireBearerToken('Basic abc123')).toThrow(UnauthorisedError)
  })

  it('throws UnauthorisedError when casing is wrong', () => {
    expect(() => requireBearerToken('bearer abc123')).toThrow(UnauthorisedError)
  })

  it('throws UnauthorisedError when token is empty', () => {
    expect(() => requireBearerToken('Bearer ')).toThrow(UnauthorisedError)
  })

  it('throws UnauthorisedError when token is only whitespace', () => {
    expect(() => requireBearerToken('Bearer    ')).toThrow(UnauthorisedError)
  })
})
