import type { ConsentResponse } from '../data/consents.js'
import type { ConsentsPage } from '../pages/consents-page.js'

import { expectedConsentResponseFields } from '../data/consents.js'
import { expect } from 'vitest'

export async function expectConsentSuccess(response: {
  json: () => Promise<Record<string, unknown>>
  status: () => number
}) {
  expect(response.status()).toBe(200)
  const body = (await response.json()) as unknown as ConsentResponse
  for (const field of expectedConsentResponseFields) {
    expect(body).toHaveProperty(field)
  }
  expect(body.permissions).toBeInstanceOf(Array)
  expect(body.user_info).toBeDefined()
  return body
}

export async function getConsent(consentsPage: ConsentsPage, id: string) {
  return consentsPage.getConsent(id)
}

export async function postConsent(consentsPage: ConsentsPage, body: Record<string, unknown>) {
  return consentsPage.createConsent(body)
}
