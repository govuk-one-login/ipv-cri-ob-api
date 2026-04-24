import { defaultBanksParams } from '../data/banks.js'
import { validConsentsRequest } from '../data/consents.js'
import { validIdentityVerificationRequest } from '../data/identity-verification.js'
import { validSessionRequest } from '../data/session.js'
import { validTokenRequest } from '../data/token.js'
import { BanksPage } from '../pages/banks-page.js'
import { ConsentsPage } from '../pages/consents-page.js'
import { IdentityVerificationPage } from '../pages/identity-verification-page.js'
import { SessionPage } from '../pages/session-page.js'
import { TokenPage } from '../pages/token-page.js'
import { disposeApiContext, getApiContext } from '../utils/api-client.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('E2E Journey: Session to Identity Verification', () => {
  let sessionPage: SessionPage
  let tokenPage: TokenPage
  let banksPage: BanksPage
  let consentsPage: ConsentsPage
  let identityVerificationPage: IdentityVerificationPage

  beforeAll(async () => {
    const api = await getApiContext()
    sessionPage = new SessionPage(api)
    tokenPage = new TokenPage(api)
    banksPage = new BanksPage(api)
    consentsPage = new ConsentsPage(api)
    identityVerificationPage = new IdentityVerificationPage(api)
  })

  afterAll(async () => {
    await disposeApiContext()
  })

  it('should complete the full open banking verification journey', async () => {
    const sessionResponse = await sessionPage.createSession(validSessionRequest)
    expect(sessionResponse.status()).toBe(200)
    const sessionBody = (await sessionResponse.json()) as Record<string, unknown>
    expect(sessionBody).toBeDefined()

    const tokenResponse = await tokenPage.createToken(validTokenRequest)
    expect(tokenResponse.status()).toBe(200)
    const tokenBody = (await tokenResponse.json()) as Record<string, unknown>
    expect(tokenBody).toBeDefined()

    const banksResponse = await banksPage.getBanks(defaultBanksParams)
    expect(banksResponse.status()).toBe(200)
    const banksBody = (await banksResponse.json()) as Record<string, unknown>
    expect(banksBody).toHaveProperty('data')
    expect(Array.isArray(banksBody['data'])).toBe(true)

    const consentResponse = await consentsPage.createConsent(validConsentsRequest)
    expect(consentResponse.status()).toBe(200)
    const consentBody = (await consentResponse.json()) as Record<string, unknown>
    expect(consentBody).toBeDefined()
    const consentId = consentBody['id'] as string
    expect(consentId).toBeDefined()

    const verificationResponse = await identityVerificationPage.postIdentityVerification(
      consentId,
      validIdentityVerificationRequest
    )
    expect(verificationResponse.status()).toBe(200)
    const verificationBody = (await verificationResponse.json()) as Record<string, unknown>
    expect(verificationBody).toHaveProperty('id')
    expect(verificationBody).toHaveProperty('consent_id')
    expect(verificationBody).toHaveProperty('status')
    expect(verificationBody).toHaveProperty('personal_details_score')
    expect(verificationBody).toHaveProperty('address_score')
  })
})
