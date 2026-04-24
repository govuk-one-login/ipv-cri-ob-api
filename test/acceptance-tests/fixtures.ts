import type { APIResponse } from '@playwright/test'

import { test as base } from 'playwright-bdd'

interface Fixtures {
  consentId: { value: string }
  response: { value: APIResponse }
  responseBody: { value: Record<string, unknown> }
}

export const test = base.extend<Fixtures>({
  consentId: async ({}, use) => use({ value: '' }),
  response: async ({}, use) => use({ value: null! }),
  responseBody: async ({}, use) => use({ value: {} })
})

export const parseBody = async (response: APIResponse): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>

export { expect } from '@playwright/test'
