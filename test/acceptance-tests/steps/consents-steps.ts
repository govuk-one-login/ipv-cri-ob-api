import type { ConsentResponse } from '../data/consents.js'
import type { OBWorld } from '../world.js'

import {
  invalidConsentsRequest,
  missingFieldsConsentsRequest,
  validConsentsRequest
} from '../data/consents.js'
import { Given, When } from '@cucumber/cucumber'

import assert from 'node:assert/strict'

const consentFixtures: Record<string, Record<string, unknown>> = {
  'invalid body': invalidConsentsRequest,
  'missing fields': missingFieldsConsentsRequest
}

Given('I have created a consent', async function (this: OBWorld) {
  this.lastResponse = await this.consents.createConsent(validConsentsRequest)
  assert.equal(this.lastResponse.status(), 200)
  const body = await this.lastResponse.json<ConsentResponse>()
  this.consentId = body.id
})

When('I create a consent with valid details', async function (this: OBWorld) {
  this.lastResponse = await this.consents.createConsent(validConsentsRequest)
  const body = await this.lastResponse.json<ConsentResponse>()
  if (body.id) this.consentId = body.id
})

When('I retrieve the consent by its id', async function (this: OBWorld) {
  this.lastResponse = await this.consents.getConsent(this.consentId)
})

When('I retrieve a consent with id {string}', async function (this: OBWorld, id: string) {
  this.lastResponse = await this.consents.getConsent(id)
})

When('I create a consent with {string}', async function (this: OBWorld, fixture: string) {
  const body = consentFixtures[fixture]
  if (!body) throw new Error(`Unknown consent fixture: "${fixture}"`)
  this.lastResponse = await this.consents.createConsent(body)
})
