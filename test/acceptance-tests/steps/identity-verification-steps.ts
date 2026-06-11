import type { OBWorld } from '../world.js'

import {
  identityVerificationRequestWithSurname,
  validIdentityVerificationRequest
} from '../data/identity-verification.js'
import { When } from '@cucumber/cucumber'

When('I post identity verification for the created consent', async function (this: OBWorld) {
  this.lastResponse = await this.identityVerification.postIdentityVerification(
    this.consentId,
    validIdentityVerificationRequest
  )
})

When(
  'I post identity verification for the created consent with surname {string}',
  async function (this: OBWorld, surname: string) {
    this.lastResponse = await this.identityVerification.postIdentityVerification(
      this.consentId,
      identityVerificationRequestWithSurname(surname)
    )
  }
)

When('I post identity verification using an invalid token', async function (this: OBWorld) {
  this.lastResponse = await this.identityVerification.postIdentityVerification(
    this.consentId,
    validIdentityVerificationRequest,
    { headers: { Authorization: 'Bearer invalid_token' } }
  )
})

When('I post identity verification using an invalid scope token', async function (this: OBWorld) {
  this.lastResponse = await this.identityVerification.postIdentityVerification(
    this.consentId,
    validIdentityVerificationRequest,
    { headers: { Authorization: 'Bearer invalid_scope_token' } }
  )
})

When('I post identity verification using an expired token', async function (this: OBWorld) {
  this.lastResponse = await this.identityVerification.postIdentityVerification(
    this.consentId,
    validIdentityVerificationRequest,
    { headers: { Authorization: 'Bearer expired_token' } }
  )
})
