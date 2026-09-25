import { nowSeconds } from '@common/util/time'
import { type CreatedConsent } from '@src/consents/model/consents-provider'

// this is nothing to do with the `consent_expiry_date` returned by ecospend.
// the bankConsentUrl lasts 5-15 minutes depending on the bank, so 5 minutes is the most we can assume.
// 240 seconds gives us a minute of buffer.
const BANK_CONSENT_URL_EXPIRY_SECONDS = 240
const CONSENT_TTL_SECONDS = 2 * 60 * 60

export interface ConsentEntity {
  bankConsentUrl: string
  bankConsentUrlExpirySeconds: number
  bankId: string
  consentId: string
  sessionId: string
  ttl: number
}

export const toConsentEntity = (consent: CreatedConsent, sessionId: string): ConsentEntity => {
  const now = nowSeconds()
  return {
    bankConsentUrl: consent.bankConsentUrl,
    bankConsentUrlExpirySeconds: now + BANK_CONSENT_URL_EXPIRY_SECONDS,
    bankId: consent.bankId,
    consentId: consent.consentId,
    sessionId,
    ttl: now + CONSENT_TTL_SECONDS
  }
}
