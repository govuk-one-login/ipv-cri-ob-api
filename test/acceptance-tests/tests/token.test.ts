import { validTokenRequest } from '../data/token.js'
import { TokenPage } from '../pages/token-page.js'
import { expectTokenCreated, postToken } from '../steps/token-steps.js'
import { disposeApiContext, getApiContext } from '../utils/api-client.js'
import { afterAll, beforeAll, describe, it } from 'vitest'

describe('Token endpoint', () => {
  let tokenPage: TokenPage

  beforeAll(async () => {
    const api = await getApiContext()
    tokenPage = new TokenPage(api)
  })

  afterAll(async () => {
    await disposeApiContext()
  })

  it('should create a token successfully', async () => {
    const response = await postToken(tokenPage, validTokenRequest)
    await expectTokenCreated(response)
  })
})
