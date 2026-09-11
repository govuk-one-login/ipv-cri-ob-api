import type { BankListEntity } from '../../../src/bank-list/model/bank-list.js'
import type { OBWorld } from '../world.js'

import { Given, Then, When } from '@cucumber/cucumber'

import assert from 'node:assert/strict'

Given('I request the list of banks', async function (this: OBWorld) {
  this.lastResponse = await this.banks.getBanks()
})

When(
  'I request the list of banks with session-id header {string}',
  async function (this: OBWorld, sessionId: string) {
    this.lastResponse = await this.banks.getBanks({ headers: { 'session-id': sessionId } })
  }
)

Then('the response should contain a valid banks list', function (this: OBWorld) {
  const body = this.lastResponse.json<BankListEntity>()
  assert.ok(Array.isArray(body.banks))
  assert.ok(body.banks.length > 0)
  const bank = body.banks[0]
  assert.ok(bank)
  assert.ok(bank.bankId)
  assert.ok(bank.friendlyName)
  assert.equal(typeof bank.serviceStatus, 'boolean')
  assert.equal(typeof body.refreshedAtSeconds, 'number')
  assert.ok(body.profile)
})
