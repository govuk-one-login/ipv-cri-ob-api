import type { OBWorld } from '../world.js'

import { validTokenRequest } from '../data/token.js'
import { When } from '@cucumber/cucumber'

When('I create a token with valid details', async function (this: OBWorld) {
  this.lastResponse = await this.token.createToken(validTokenRequest)
})
