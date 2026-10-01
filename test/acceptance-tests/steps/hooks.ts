import type { TokenResponse } from '../clients/token-client'
import type { OBWorld } from '../world'

import { validTokenRequest } from '../data/token'
import { createSession } from '../helpers/session'
import { createAuthenticatedClients, getPublicBaseUrl } from '../utils/api-client'
import { Before } from '@cucumber/cucumber'

Before({ tags: '@needs-session', timeout: 30000 }, async function (this: OBWorld) {
  await createSession(this)
})

Before(
  { tags: 'not @api-test and not @QualityGateSmokeTest and not @QualityGateIntegrationTest' },
  async function (this: OBWorld) {
    const publicBaseUrl = getPublicBaseUrl()
    const tokenResponse = await this.token.createToken(validTokenRequest)
    const { identityVerification, issueCredential } = createAuthenticatedClients(
      publicBaseUrl,
      tokenResponse.json<TokenResponse>()
    )
    this.identityVerification = identityVerification
    this.issueCredential = issueCredential
  }
)
