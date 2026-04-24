import { validSessionRequest } from '../data/session.js'
import { SessionPage } from '../pages/session-page.js'
import { expectSessionCreated, postSession } from '../steps/session-steps.js'
import { disposeApiContext, getApiContext } from '../utils/api-client.js'
import { afterAll, beforeAll, describe, it } from 'vitest'

describe('Session endpoint', () => {
  let sessionPage: SessionPage

  beforeAll(async () => {
    const api = await getApiContext()
    sessionPage = new SessionPage(api)
  })

  afterAll(async () => {
    await disposeApiContext()
  })

  it('should create a session successfully', async () => {
    const response = await postSession(sessionPage, validSessionRequest)
    await expectSessionCreated(response)
  })
})
