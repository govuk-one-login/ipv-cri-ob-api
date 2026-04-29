import { malformedSessionRequest, validSessionRequest } from '../data/session'
import { parseBody, test } from '../fixtures'
import { SessionPage } from '../pages/session-page'
import { createBdd } from 'playwright-bdd'

const { When } = createBdd(test)

When('I create a session', async ({ request, response, responseBody }) => {
  response.value = await new SessionPage(request).createSession(validSessionRequest)
  responseBody.value = await parseBody(response.value)
})

When('I create a session with an empty body', async ({ request, response }) => {
  response.value = await new SessionPage(request).createSession({})
})

When('I create a session with a malformed body', async ({ request, response }) => {
  response.value = await new SessionPage(request).createSession(malformedSessionRequest)
})
