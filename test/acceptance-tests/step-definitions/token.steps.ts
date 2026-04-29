import { malformedTokenRequest, validTokenRequest } from '../data/token'
import { parseBody, test } from '../fixtures'
import { TokenPage } from '../pages/token-page'
import { createBdd } from 'playwright-bdd'

const { When } = createBdd(test)

When('I create a token', async ({ request, response, responseBody }) => {
  response.value = await new TokenPage(request).createToken(validTokenRequest)
  responseBody.value = await parseBody(response.value)
})

When('I create a token with an empty body', async ({ request, response }) => {
  response.value = await new TokenPage(request).createToken({})
})

When('I create a token with a malformed body', async ({ request, response }) => {
  response.value = await new TokenPage(request).createToken(malformedTokenRequest)
})
