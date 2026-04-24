import type { BanksParams } from '../data/banks.js'
import type { BanksPage } from '../pages/banks-page.js'

import { expect } from 'vitest'

export async function expectBanksReturned(response: {
  json: () => Promise<Record<string, unknown>>
  status: () => number
}) {
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body).toHaveProperty('data')
  expect(body).toHaveProperty('meta')
  expect(Array.isArray(body['data'])).toBe(true)
  return body
}

export async function getBanks(banksPage: BanksPage, params?: BanksParams) {
  return banksPage.getBanks(params)
}
