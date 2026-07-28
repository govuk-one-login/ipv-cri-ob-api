import type { SessionResponse } from '../../../src/types/session.js'
import type { TokenResponse } from '../../../src/types/token.js'
import type { OBWorld } from '../world.js'

import { type CoreStubOverrides, getJwt } from '../helpers/core-stub.js'
import {
  apiFetch,
  createAuthenticatedClients,
  getPrivateBaseUrl,
  getPublicBaseUrl
} from '../utils/api-client.js'
import { Given, Then, When } from '@cucumber/cucumber'

import lowConfidenceOverride from '../data/overrides/low-confidence.json' with { type: 'json' }
import assert from 'node:assert/strict'

const profiles: Record<string, CoreStubOverrides> = {
  default: {},
  'low-confidence': lowConfidenceOverride
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/

Given('a session has been created via the core stub', function (this: OBWorld) {
  assert.ok(this.sessionId)
})

Then('the session should be valid', function (this: OBWorld) {
  assert.match(this.sessionId, UUID_REGEX)
  assert.match(this.sessionState, BASE64_REGEX)
  assert.doesNotThrow(() => new URL(this.sessionRedirectUri))
})

Given(
  'a session has been created via the core stub using the {string} profile',
  async function (this: OBWorld, profile: string) {
    const overrides = profiles[profile]
    if (!overrides) throw new Error(`Unknown profile: "${profile}"`)
    const { client_id, request } = await getJwt(overrides)
    const sessionResponse = await this.session.createSession({ client_id, request })
    if (sessionResponse.status() !== 201)
      throw new Error(
        `Session creation failed: ${sessionResponse.status()} ${sessionResponse.text()}`
      )
    this.sessionId = sessionResponse.json<SessionResponse>().session_id
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
  const { consents, identityVerification, issueCredential } = createAuthenticatedClients(
    publicBaseUrl,
    token
  )
  this.consents = consents
  this.identityVerification = identityVerification
  this.issueCredential = issueCredential
})

Then('the response should contain a valid session', function (this: OBWorld) {
  const body = this.lastResponse.json<SessionResponse>()
  assert.ok(body.session_id)
  assert.ok(body.redirect_uri)
})
