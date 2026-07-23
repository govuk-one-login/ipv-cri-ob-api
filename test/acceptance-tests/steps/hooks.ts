import type { SessionResponse } from '../../../src/types/session.js'
import type { TokenResponse } from '../../../src/types/token.js'
import type { OBWorld } from '../world.js'

import { validTokenRequest } from '../data/token.js'
import { getJwt } from '../helpers/core-stub.js'
import { createAuthenticatedClients, getBaseUrl } from '../utils/api-client.js'
import { Before } from '@cucumber/cucumber'

Before(
  { tags: 'not @api-test and not @QualityGateSmokeTest and not @QualityGateIntegrationTest' },
  async function (this: OBWorld) {
    const baseUrl = getBaseUrl()
    const tokenResponse = await this.token.createToken(validTokenRequest)
    const { consents, identityVerification, issueCredential } = createAuthenticatedClients(
      baseUrl,
      tokenResponse.json<TokenResponse>()
    )
    this.consents = consents
    this.identityVerification = identityVerification
    this.issueCredential = issueCredential
  }
)

Before(
  { tags: '@api-test or @QualityGateSmokeTest', timeout: 30000 },
  async function (this: OBWorld) {
    const { client_id, request } = await getJwt()
    const sessionResponse = await this.session.createSession({ client_id, request })
    if (sessionResponse.status() !== 201)
      throw new Error(
        `Session creation failed: ${sessionResponse.status()} ${sessionResponse.text()}`
      )
    const { redirect_uri, session_id, state } = sessionResponse.json<SessionResponse>()
    this.sessionId = session_id
    this.sessionState = state
    this.sessionRedirectUri = redirect_uri
  }
)
