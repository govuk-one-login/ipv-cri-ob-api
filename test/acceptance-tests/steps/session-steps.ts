import type { SessionPage } from '../pages/session-page.js'

import { expect } from 'vitest'

export async function expectSessionCreated(response: {
  json: () => Promise<unknown>
  status: () => number
}) {
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body).toBeDefined()
  return body
}

export async function postSession(sessionPage: SessionPage, body: Record<string, unknown>) {
  const response = await sessionPage.createSession(body)
  return response
}
