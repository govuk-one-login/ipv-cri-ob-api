import type { BaseHttpClient } from '@common/client/base-http-client'
import type { CreateConsentRequest, CreatedConsent } from '@src/consents/model/consents-provider'

import { EndpointProfile } from '@common/model/endpoint-profile'
import { createEcospendConsentsProvider } from '@src/consents/client/ecospend-consents-provider'
import { describe, expect, it, vi } from 'vitest'

const ACCESS_TOKEN = 'test-access-token'
const ENDPOINT_URL = 'https://ecospend.test/consents'

const createConsentRequest: CreateConsentRequest = {
  accessToken: ACCESS_TOKEN,
  bankId: 'iron-bank',
  endpointUrl: ENDPOINT_URL,
  profile: EndpointProfile.STUB,
  returnUrl: 'https://return.test/callback'
}

const createdConsent: CreatedConsent = {
  bankConsentUrl: 'https://iron.bank.test/consent/abc',
  bankId: 'iron-bank',
  consentId: 'consent-abc'
}

const ecospendResponse = {
  bank_consent_url: 'https://iron.bank.test/consent/abc',
  bank_id: 'iron-bank',
  id: 'consent-abc'
}

const createTestContext = () => {
  const postJson = vi.fn().mockResolvedValue(ecospendResponse)
  const httpClient: BaseHttpClient = { postJson }
  const consentsProvider = createEcospendConsentsProvider({ httpClient })

  return { consentsProvider, postJson }
}

describe('createEcospendConsentsProvider', () => {
  it('creates and sends a consent request', async () => {
    const { consentsProvider, postJson } = createTestContext()

    await consentsProvider.createConsent(createConsentRequest)

    expect(postJson).toHaveBeenCalledWith({
      accessToken: ACCESS_TOKEN,
      body: {
        bank_id: 'iron-bank',
        permissions: [
          'Account',
          'Balance',
          'Transactions',
          'DirectDebits',
          'StandingOrders',
          'ScheduledPayments'
        ],
        redirect_url: 'https://return.test/callback'
      },
      profile: EndpointProfile.STUB,
      url: ENDPOINT_URL
    })
  })

  it('maps a valid response', async () => {
    const { consentsProvider } = createTestContext()

    await expect(consentsProvider.createConsent(createConsentRequest)).resolves.toEqual(
      createdConsent
    )
  })

  it('rejects a response that is missing a required field', async () => {
    const { consentsProvider, postJson } = createTestContext()
    const { bank_consent_url: _omitted, ...withoutConsentUrl } = ecospendResponse
    postJson.mockResolvedValue(withoutConsentUrl)

    await expect(consentsProvider.createConsent(createConsentRequest)).rejects.toThrow(
      'Unexpected consents response'
    )
  })

  it('rejects a bank consent url that is not a url', async () => {
    const { consentsProvider, postJson } = createTestContext()
    postJson.mockResolvedValue({ ...ecospendResponse, bank_consent_url: 'not-a-url' })

    await expect(consentsProvider.createConsent(createConsentRequest)).rejects.toThrow(
      'Unexpected consents response'
    )
  })

  it('ignores unknown fields in the response', async () => {
    const { consentsProvider, postJson } = createTestContext()
    postJson.mockResolvedValue({ ...ecospendResponse, unknown_key: 'value' })

    await expect(consentsProvider.createConsent(createConsentRequest)).resolves.toEqual(
      createdConsent
    )
  })

  it('propagates fetch failures', async () => {
    const { consentsProvider, postJson } = createTestContext()
    const transportError = new Error('consents request returned 503')
    postJson.mockRejectedValue(transportError)

    await expect(consentsProvider.createConsent(createConsentRequest)).rejects.toBe(transportError)
  })
})
