import {
  expectedIdentityVerificationResponseFields,
  malformedIdentityVerificationRequest,
  validIdentityVerificationRequest
} from '../data/identity-verification'
import { expect, parseBody, test } from '../fixtures'
import { IdentityVerificationPage } from '../pages/identity-verification-page'
import { createBdd } from 'playwright-bdd'

const { Then, When } = createBdd(test)

When(
  'I retrieve identity verification for consent {string}',
  async ({ request, response, responseBody }, consentId: string) => {
    response.value = await new IdentityVerificationPage(request).getIdentityVerification(consentId)
    responseBody.value = await parseBody(response.value)
  }
)

When(
  'I post identity verification for consent {string}',
  async ({ request, response, responseBody }, consentId: string) => {
    response.value = await new IdentityVerificationPage(request).postIdentityVerification(
      consentId,
      validIdentityVerificationRequest
    )
    responseBody.value = await parseBody(response.value)
  }
)

When(
  'I post identity verification for consent {string} with an empty body',
  async ({ request, response }, consentId: string) => {
    response.value = await new IdentityVerificationPage(request).postIdentityVerification(
      consentId,
      {}
    )
  }
)

When(
  'I post identity verification for consent {string} with a malformed body',
  async ({ request, response }, consentId: string) => {
    response.value = await new IdentityVerificationPage(request).postIdentityVerification(
      consentId,
      malformedIdentityVerificationRequest
    )
  }
)

When(
  'I post identity verification for consent {string} with a valid body',
  async ({ request, response }, consentId: string) => {
    response.value = await new IdentityVerificationPage(request).postIdentityVerification(
      consentId,
      validIdentityVerificationRequest
    )
  }
)

When(
  'I post identity verification for the stored consent',
  async ({ consentId, request, response, responseBody }) => {
    response.value = await new IdentityVerificationPage(request).postIdentityVerification(
      consentId.value,
      validIdentityVerificationRequest
    )
    responseBody.value = await parseBody(response.value)
  }
)

Then('the response should contain identity verification fields', async ({ responseBody }) => {
  for (const field of expectedIdentityVerificationResponseFields) {
    expect(responseBody.value).toHaveProperty(field)
  }
})

Then(
  'the identity verification consent_id should be {string}',
  async ({ responseBody }, consentId: string) => {
    expect(responseBody.value['consent_id']).toBe(consentId)
  }
)

Then(
  'the identity verification status should be {string}',
  async ({ responseBody }, status: string) => {
    expect(responseBody.value['status']).toBe(status)
  }
)
