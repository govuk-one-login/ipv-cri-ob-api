import type { SessionResponse } from '../../../src/types/session.js'
import type { OBWorld } from '../world.js'

import { validSessionRequest } from '../data/session.js'
import { Then, When } from '@cucumber/cucumber'

import assert from 'node:assert/strict'

When('I create a session request with valid details', async function (this: OBWorld) {
  this.lastResponse = await this.session.createSession(validSessionRequest)
})

Then('the response should contain a valid session', function (this: OBWorld) {
  const body = this.lastResponse.json<SessionResponse>()
  assert.ok(body.request)
  assert.ok(body.client_id)
})
