import type { TokenResponse } from '../clients/token-client'
import type { OBWorld } from '../world'

import { createSession } from '../helpers/session'
import { type TestHarnessOverrides } from '../helpers/test-harness'
import {
  apiFetch,
  createAuthenticatedClients,
  getPrivateBaseUrl,
  getPublicBaseUrl
} from '../utils/api-client'
import { Given, When } from '@cucumber/cucumber'

import lowConfidenceOverride from '../data/overrides/low-confidence.json' with { type: 'json' }

const profiles: Record<string, TestHarnessOverrides> = {
  default: {},
  'low-confidence': lowConfidenceOverride
}

Given(
  'a session has been created using the {string} profile',
  { timeout: 30000 },
  async function (this: OBWorld, profile: string) {
    const overrides = profiles[profile]
    if (!overrides) throw new Error(`Unknown profile: "${profile}"`)
    await createSession(this, overrides)
  }
)

When('I request an authorization code', async function (this: OBWorld) {
  const privateBaseUrl = getPrivateBaseUrl()
  const authParams = new URLSearchParams({
    client_id: 'ipv-core-stub-aws-headless',
    redirect_uri: this.sessionRedirectUri,
    response_type: 'code',
    state: this.sessionState
  })
  const authResponse = await apiFetch(`${privateBaseUrl}/authorization?${authParams.toString()}`, {
    headers: { 'session-id': this.sessionId }
  })
  if (authResponse.status() !== 200)
    throw new Error(`Authorization failed: ${authResponse.status()} ${authResponse.text()}`)
  this.authCode = authResponse.json<{ code: string }>().code
})

When('I exchange the authorisation code for a token', async function (this: OBWorld) {
  const publicBaseUrl = getPublicBaseUrl()
  const tokenResponse = await this.token.createToken({
    code: this.authCode,
    grant_type: 'authorization_code',
    redirect_uri: this.sessionRedirectUri
  })
  if (tokenResponse.status() !== 200)
    throw new Error(`Token exchange failed: ${tokenResponse.status()} ${tokenResponse.text()}`)
  const token = tokenResponse.json<TokenResponse>()
  this.accessToken = token.access_token
  const { identityVerification, issueCredential } = createAuthenticatedClients(publicBaseUrl, token)
  this.identityVerification = identityVerification
  this.issueCredential = issueCredential
})
