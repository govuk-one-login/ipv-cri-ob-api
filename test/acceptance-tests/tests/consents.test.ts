import { validConsentsRequest } from '../data/consents.js'
import { ConsentsPage } from '../pages/consents-page.js'
import { expectConsentSuccess, getConsent, postConsent } from '../steps/consents-steps.js'
import { disposeApiContext, getApiContext } from '../utils/api-client.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('Consents endpoint', () => {
  let consentsPage: ConsentsPage
  let createdConsentId: string

  beforeAll(async () => {
    const api = await getApiContext()
    consentsPage = new ConsentsPage(api)
  })

  afterAll(async () => {
    await disposeApiContext()
  })

  it('should create a consent successfully', async () => {
    const response = await postConsent(consentsPage, validConsentsRequest)
    const body = await expectConsentSuccess(response)
    createdConsentId = body.id
    expect(createdConsentId).toBeDefined()
    expect(body.bank_id).toBe(validConsentsRequest.bank_id)
    expect(body.status).toBe('AwaitingAuthorization')
  })

  it('should retrieve a consent by id', async () => {
    const response = await getConsent(consentsPage, createdConsentId)
    const body = await expectConsentSuccess(response)
    expect(body.id).toBe(createdConsentId)
  })
})
