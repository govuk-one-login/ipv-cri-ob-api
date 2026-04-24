import type { IdentityVerificationResponse } from '../data/identity-verification.js'
import type { IdentityVerificationPage } from '../pages/identity-verification-page.js'

import { expectedIdentityVerificationResponseFields } from '../data/identity-verification.js'
import { expect } from 'vitest'

export async function expectIdentityVerificationSuccess(response: {
  json: () => Promise<Record<string, unknown>>
  status: () => number
}): Promise<IdentityVerificationResponse> {
  expect(response.status()).toBe(200)
  const body = (await response.json()) as unknown as IdentityVerificationResponse
  for (const field of expectedIdentityVerificationResponseFields) {
    expect(body).toHaveProperty(field)
  }
  expect(typeof body.personal_details_score).toBe('number')
  expect(typeof body.address_score).toBe('number')
  return body
}

export async function getIdentityVerification(page: IdentityVerificationPage, consentId: string) {
  return page.getIdentityVerification(consentId)
}

export async function postIdentityVerification(
  page: IdentityVerificationPage,
  consentId: string,
  body: Record<string, unknown>
) {
  return page.postIdentityVerification(consentId, body)
}
