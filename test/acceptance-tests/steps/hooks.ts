import type { TokenResponse } from '../../../src/types/token.js'
import type { OBWorld } from '../world.js'

import { validTokenRequest } from '../data/token.js'
import { createAuthenticatedClients, getBaseUrl } from '../utils/api-client.js'
import { Before } from '@cucumber/cucumber'

Before(async function (this: OBWorld) {
  const baseUrl = getBaseUrl()
  const tokenResponse = await this.token.createToken(validTokenRequest)
  const { consents, identityVerification, issueCredential } = createAuthenticatedClients(
    baseUrl,
    tokenResponse.json<TokenResponse>()
  )
  this.consents = consents
  this.identityVerification = identityVerification
  this.issueCredential = issueCredential
})
