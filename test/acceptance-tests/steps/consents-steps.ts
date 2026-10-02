import type { BankListResponse } from '../clients/banks-client'
import type { ConsentsResponse } from '../clients/consents-client'
import type { OBWorld } from '../world'

import { consentsRequestBody } from '../data/consents'
import { Given, Then, When } from '@cucumber/cucumber'

import assert from 'node:assert/strict'

const onlineBankId = async (world: OBWorld): Promise<string> => {
  const response = await world.banks.getBanks()
  if (response.status() !== 200)
    throw new Error(`Could not list banks: ${response.status()} ${response.text()}`)

  const bank = response.json<BankListResponse>().banks.find((bank) => bank.serviceStatus)
  if (!bank) throw new Error('This environment has no online banks to create a consent for')
  return bank.bankId
}

const createConsent = async (world: OBWorld, bankId: string): Promise<void> => {
  world.lastResponse = await world.consents.createConsent(consentsRequestBody(bankId))
}

Given('I have created a consent', async function (this: OBWorld) {
  this.bankId = await onlineBankId(this)
  await createConsent(this, this.bankId)
  assert.equal(this.lastResponse.status(), 201)
  this.consentId = this.lastResponse.json<ConsentsResponse>().id
})

When('I create a consent for an online bank', async function (this: OBWorld) {
  this.bankId = await onlineBankId(this)
  await createConsent(this, this.bankId)
})

When('I create a consent for the same bank', async function (this: OBWorld) {
  await createConsent(this, this.bankId)
})

When('I create a consent for an unknown bank', async function (this: OBWorld) {
  await createConsent(this, 'roflcopter-bank')
})

When('I create a consent with body {string}', async function (this: OBWorld, body: string) {
  this.lastResponse = await this.consents.createConsent(body)
})

When('I create a consent with no body', async function (this: OBWorld) {
  this.lastResponse = await this.consents.createConsent('')
})

When(
  'I create a valid consent request with session-id header {string}',
  async function (this: OBWorld, sessionId: string) {
    this.lastResponse = await this.consents.createConsent(consentsRequestBody('any-bank'), {
      headers: { 'session-id': sessionId }
    })
  }
)

Then('the consent url should be an https url', function (this: OBWorld) {
  const { url } = this.lastResponse.json<ConsentsResponse>()
  assert.equal(new URL(url).protocol, 'https:')
})

Then('the consent url should expire in about 4 minutes', function (this: OBWorld) {
  const { urlExpiresAtSeconds } = this.lastResponse.json<ConsentsResponse>()
  const expectedExpiry = Math.floor(Date.now() / 1000) + 240
  assert.ok(
    Math.abs(urlExpiresAtSeconds - expectedExpiry) <= 30,
    `Expected urlExpiresAtSeconds (${urlExpiresAtSeconds}) to be within 30s of ${expectedExpiry}`
  )
})

Then('the consent should be the one created earlier', function (this: OBWorld) {
  assert.equal(this.lastResponse.json<ConsentsResponse>().id, this.consentId)
})
