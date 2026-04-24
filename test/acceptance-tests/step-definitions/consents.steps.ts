import {
  expectedConsentResponseFields,
  malformedConsentsRequest,
  validConsentsRequest
} from '../data/consents'
import { expect, parseBody, test } from '../fixtures'
import { ConsentsPage } from '../pages/consents-page'
import { createBdd } from 'playwright-bdd'

const { Given, Then, When } = createBdd(test)

When('I create a consent', async ({ request, response, responseBody }) => {
  response.value = await new ConsentsPage(request).createConsent(validConsentsRequest)
  responseBody.value = await parseBody(response.value)
})

When('I create a consent with an empty body', async ({ request, response }) => {
  response.value = await new ConsentsPage(request).createConsent({})
})

When('I create a consent with a malformed body', async ({ request, response }) => {
  response.value = await new ConsentsPage(request).createConsent(malformedConsentsRequest)
})

Given('a consent has been created', async ({ consentId, request, response, responseBody }) => {
  response.value = await new ConsentsPage(request).createConsent(validConsentsRequest)
  responseBody.value = await parseBody(response.value)
  consentId.value = responseBody.value['id'] as string
})

When('I retrieve the consent by id', async ({ consentId, request, response, responseBody }) => {
  response.value = await new ConsentsPage(request).getConsent(consentId.value)
  responseBody.value = await parseBody(response.value)
})

When('I retrieve the consent with id {string}', async ({ request, response }, id: string) => {
  response.value = await new ConsentsPage(request).getConsent(id)
})

Then('I store the consent id', async ({ consentId, responseBody }) => {
  consentId.value = responseBody.value['id'] as string
  expect(consentId.value).toBeTruthy()
})

Then('the response should contain consent fields', async ({ responseBody }) => {
  for (const field of expectedConsentResponseFields) {
    expect(responseBody.value).toHaveProperty(field)
  }
})

Then('the consent bank_id should be {string}', async ({ responseBody }, bankId: string) => {
  expect(responseBody.value['bank_id']).toBe(bankId)
})

Then('the consent status should be {string}', async ({ responseBody }, status: string) => {
  expect(responseBody.value['status']).toBe(status)
})
