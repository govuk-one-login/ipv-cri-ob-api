import type { MockInstance } from 'vitest'

import { EndpointProfile } from '@common/model/endpoint-profile'
import { getEndpointProfileForClientId, OAuthClientId } from '@common/model/oauth-client-id'
import { logger } from '@govuk-one-login/cri-logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('getEndpointProfileForClientId', () => {
  let errorSpy: MockInstance<typeof logger.error>

  beforeEach(() => {
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
  })

  it.each([
    [OAuthClientId.IPV_CORE, EndpointProfile.LIVE],
    [OAuthClientId.IPV_CORE_STUB, EndpointProfile.STUB],
    [OAuthClientId.IPV_CORE_STUB_AWS_BUILD, EndpointProfile.STUB],
    [OAuthClientId.IPV_CORE_STUB_AWS_BUILD_THIRD_PARTY, EndpointProfile.UAT],
    [OAuthClientId.IPV_CORE_STUB_AWS_PROD, EndpointProfile.STUB],
    [OAuthClientId.IPV_CORE_STUB_AWS_PROD_THIRD_PARTY, EndpointProfile.UAT],
    [OAuthClientId.IPV_CORE_STUB_PRE_PROD_AWS_BUILD, EndpointProfile.LIVE],
    [OAuthClientId.IPV_CORE_THIRD_PARTY_STUBS, EndpointProfile.STUB]
  ])('maps client id %s to profile %s', (clientId, expectedProfile) => {
    expect(getEndpointProfileForClientId(clientId)).toBe(expectedProfile)
  })

  it.each(['crumbs', ''])(
    'defaults to LIVE and logs an error for unknown client id %j',
    (clientId) => {
      expect(getEndpointProfileForClientId(clientId)).toBe(EndpointProfile.LIVE)
      expect(errorSpy).toHaveBeenCalledWith(
        `Unknown OAuth Client: ${clientId}, defaulting to LIVE profile`
      )
    }
  )
})
