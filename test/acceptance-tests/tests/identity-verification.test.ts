import {
  validConsentIdForVerification,
  validIdentityVerificationRequest
} from '../data/identity-verification.js'
import { IdentityVerificationPage } from '../pages/identity-verification-page.js'
import {
  expectIdentityVerificationSuccess,
  getIdentityVerification,
  postIdentityVerification
} from '../steps/identity-verification-steps.js'
import { disposeApiContext, getApiContext } from '../utils/api-client.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('Identity Verification endpoint', () => {
  let identityVerificationPage: IdentityVerificationPage

  beforeAll(async () => {
    const api = await getApiContext()
    identityVerificationPage = new IdentityVerificationPage(api)
  })

  afterAll(async () => {
    await disposeApiContext()
  })

  it('should retrieve identity verification for a consent', async () => {
    const response = await getIdentityVerification(
      identityVerificationPage,
      validConsentIdForVerification
    )
    const body = await expectIdentityVerificationSuccess(response)
    expect(body.consent_id).toBe(validConsentIdForVerification)
  })

  it('should post identity verification for a consent', async () => {
    const response = await postIdentityVerification(
      identityVerificationPage,
      validConsentIdForVerification,
      validIdentityVerificationRequest
    )
    const body = await expectIdentityVerificationSuccess(response)
    expect(body.consent_id).toBe(validConsentIdForVerification)
    expect(body.status).toBe('Match')
  })
})
