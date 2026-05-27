import type { TokenResponse } from '../../../src/types/token.js'
import type { OBWorld } from '../world.js'

import { validTokenRequest } from '../data/token.js'
import { Before } from '@cucumber/cucumber'

Before(async function (this: OBWorld) {
  const response = await this.token.createToken(validTokenRequest)
  const { access_token } = response.json<TokenResponse>()
  this.consents.bearerToken = access_token
})
