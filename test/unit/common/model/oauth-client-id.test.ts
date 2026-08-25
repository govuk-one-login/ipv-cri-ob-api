import type { MockInstance } from 'vitest'

import { getTokenProfileForClientId, OAuthClientId } from '@common/model/oauth-client-id'
import { logger } from '@govuk-one-login/cri-logger'
import { TokenProfile } from '@lib/token-rotator/model/token-profile'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('getTokenProfileForClientId', () => {
  let errorSpy: MockInstance<typeof logger.error>

  beforeEach(() => {
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
  })

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

  it.each(['crumbs', ''])(
    'defaults to LIVE and logs an error for unknown client id %j',
    (clientId) => {
      expect(getTokenProfileForClientId(clientId)).toBe(TokenProfile.LIVE)
      expect(errorSpy).toHaveBeenCalledWith(
        `Unknown OAuth Client: ${clientId}, defaulting to LIVE profile`
      )
    }
  )
})
