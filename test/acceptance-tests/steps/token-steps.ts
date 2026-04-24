import type { TokenResponse } from '../../../src/types/token.js'
import type { OBWorld } from '../world.js'

import { validTokenRequest } from '../data/token.js'
import { Then, When } from '@cucumber/cucumber'

import assert from 'node:assert/strict'

When('I create a token request with valid details', async function (this: OBWorld) {
  this.lastResponse = await this.token.createToken(validTokenRequest)
})

Then('the response should contain a valid token', function (this: OBWorld) {
  const body = this.lastResponse.json<TokenResponse>()
  assert.ok(body.access_token)
  assert.equal(body.token_type, 'Bearer')
  assert.ok(body.expires_in > 0)
  assert.ok(body.scope)
})
