import type { OBWorld } from '../world.js'

import {
  missingFieldsIdentityVerificationRequest,
  validIdentityVerificationRequest
} from '../data/identity-verification.js'
import { When } from '@cucumber/cucumber'

When(
  'I send a {string} identity verification request for consent {string}',
  async function (this: OBWorld, method: string, consentId: string) {
    if (method === 'GET') {
      this.lastResponse = await this.identityVerification.getIdentityVerification(consentId)
    } else {
      this.lastResponse = await this.identityVerification.postIdentityVerification(
        consentId,
        validIdentityVerificationRequest
      )
    }
  }
)

When('I post identity verification for the created consent', async function (this: OBWorld) {
  this.lastResponse = await this.identityVerification.postIdentityVerification(
    this.consentId,
    validIdentityVerificationRequest
  )
})

When('I retrieve identity verification for the created consent', async function (this: OBWorld) {
  this.lastResponse = await this.identityVerification.getIdentityVerification(this.consentId)
})

When(
  'I post identity verification with missing fields for the created consent',
  async function (this: OBWorld) {
    this.lastResponse = await this.identityVerification.postIdentityVerification(
      this.consentId,
      missingFieldsIdentityVerificationRequest
    )
  }
)
