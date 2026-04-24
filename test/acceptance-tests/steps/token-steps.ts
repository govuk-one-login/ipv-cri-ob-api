import type { TokenPage } from '../pages/token-page.js'

import { expect } from 'vitest'

export async function expectTokenCreated(response: {
  json: () => Promise<unknown>
  status: () => number
}) {
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body).toBeDefined()
  return body
}

export async function postToken(tokenPage: TokenPage, body: Record<string, unknown>) {
  return tokenPage.createToken(body)
}
