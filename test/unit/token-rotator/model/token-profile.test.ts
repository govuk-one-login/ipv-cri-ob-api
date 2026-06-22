import { getTokenProfileForClientID, TokenProfile } from '@src/token-rotator/model/token-profile'
import { describe, expect, it } from 'vitest'

describe('getTokenProfileForClientID', () => {
  it('returns correct token profile when client is known', () => {
    expect(getTokenProfileForClientID('ipv-core-stub')).toBe(TokenProfile.STUB)
    expect(getTokenProfileForClientID('ipv-core')).toBe(TokenProfile.LIVE)
    expect(getTokenProfileForClientID('ipv-core-stub-aws-build_3rdparty')).toBe(TokenProfile.UAT)
  })
  it('throws when client is unknown or missing', () => {
    expect(() => getTokenProfileForClientID('crumbs')).toThrow('Unknown OAuth Client ID')
    expect(() => getTokenProfileForClientID('')).toThrow('Unknown OAuth Client ID')
  })
})
