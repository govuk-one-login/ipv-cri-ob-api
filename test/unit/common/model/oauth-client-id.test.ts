import { getTokenProfileForClientId } from '@common/model/oauth-client-id'
import { TokenProfile } from '@lib/token-rotator/model/token-profile'
import { describe, expect, it } from 'vitest'

describe('getTokenProfileForClientId', () => {
  it('returns correct token profile when client is known', () => {
    expect(getTokenProfileForClientId('ipv-core-stub')).toBe(TokenProfile.STUB)
    expect(getTokenProfileForClientId('ipv-core')).toBe(TokenProfile.LIVE)
    expect(getTokenProfileForClientId('ipv-core-stub-aws-build_3rdparty')).toBe(TokenProfile.UAT)
  })
  it('throws when client is unknown or missing', () => {
    expect(() => getTokenProfileForClientId('crumbs')).toThrow('Unknown OAuth Client ID')
    expect(() => getTokenProfileForClientId('')).toThrow('Unknown OAuth Client ID')
  })
})
