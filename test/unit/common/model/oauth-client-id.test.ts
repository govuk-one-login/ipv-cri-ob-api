import { getTokenProfileForClientId, OAuthClientId } from '@common/model/oauth-client-id'
import { TokenProfile } from '@lib/token-rotator/model/token-profile'
import { describe, expect, it } from 'vitest'

describe('getTokenProfileForClientId', () => {
  it.each([
    [OAuthClientId.IPV_CORE, TokenProfile.LIVE],
    [OAuthClientId.IPV_CORE_STUB, TokenProfile.STUB],
    [OAuthClientId.IPV_CORE_STUB_AWS_BUILD, TokenProfile.STUB],
    [OAuthClientId.IPV_CORE_STUB_AWS_BUILD_THIRD_PARTY, TokenProfile.UAT],
    [OAuthClientId.IPV_CORE_STUB_AWS_PROD, TokenProfile.STUB],
    [OAuthClientId.IPV_CORE_STUB_AWS_PROD_THIRD_PARTY, TokenProfile.UAT],
    [OAuthClientId.IPV_CORE_STUB_PRE_PROD_AWS_BUILD, TokenProfile.LIVE],
    [OAuthClientId.IPV_CORE_THIRD_PARTY_STUBS, TokenProfile.STUB]
  ])('maps client id %s to profile %s', (clientId, expectedProfile) => {
    expect(getTokenProfileForClientId(clientId)).toBe(expectedProfile)
  })
  it('throws when client is unknown or missing', () => {
    expect(() => getTokenProfileForClientId('crumbs')).toThrow('Unknown OAuth Client ID')
    expect(() => getTokenProfileForClientId('')).toThrow('Unknown OAuth Client ID')
  })
})
