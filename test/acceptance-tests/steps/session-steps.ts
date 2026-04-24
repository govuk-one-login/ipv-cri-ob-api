import type { OBWorld } from '../world.js'

import { validSessionRequest } from '../data/session.js'
import { When } from '@cucumber/cucumber'

When('I create a session with valid details', async function (this: OBWorld) {
  this.lastResponse = await this.session.createSession(validSessionRequest)
})
