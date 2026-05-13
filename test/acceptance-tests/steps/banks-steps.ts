import type { BanksRequestParams, BanksResponse } from '../../../src/types/banks.js'
import type { OBWorld } from '../world.js'

import { defaultBanksParams } from '../data/banks.js'
import { Given, Then, When } from '@cucumber/cucumber'

import assert from 'node:assert/strict'

Given('I have the default bank query params', function (this: OBWorld) {
  this.bankParams = { ...defaultBanksParams }
})

When(
  'I override the bank param {string} with {string}',
  function (this: OBWorld, param: string, value: string) {
    this.bankParams = { ...this.bankParams, [param]: value }
  }
)

When(
  'I only send the query param {string} with {string}',
  function (this: OBWorld, param: string, value: string) {
    this.bankParams = { [param]: value } as BanksRequestParams
  }
)

When('I request the list of banks', async function (this: OBWorld) {
  this.lastResponse = await this.banks.getBanks(this.bankParams)
})

When(
  'I request the list of banks with Authorization header {string}',
  async function (this: OBWorld, token: string) {
    this.lastResponse = await this.banks.getBanks(undefined, { headers: { Authorization: token } })
  }
)

Then('the response should contain an empty banks list', function (this: OBWorld) {
  const body = this.lastResponse.json<BanksResponse>()
  assert.ok(Array.isArray(body.data))
  assert.equal(body.data.length, 0)
  assert.equal(body.meta.total_count, 0)
})

Then('the response should contain a single bank', function (this: OBWorld) {
  const body = this.lastResponse.json<BanksResponse>()
  assert.ok(Array.isArray(body.data))
  assert.equal(body.data.length, 1)
  assert.equal(body.meta.total_count, 1)
})

Then('the response should contain {int} banks', function (this: OBWorld, count: number) {
  const body = this.lastResponse.json<BanksResponse>()
  assert.equal(body.data.length, count)
  assert.equal(body.meta.total_count, count)
})

Then('the response should contain some banks that are offline', function (this: OBWorld) {
  const body = this.lastResponse.json<BanksResponse>()
  const offlineBanks = body.data.filter((bank) => !bank.service_status)
  assert.ok(offlineBanks.length > 0)
})

Then('the response should contain all banks offline', function (this: OBWorld) {
  const body = this.lastResponse.json<BanksResponse>()
  assert.ok(body.data.length > 0)
  assert.ok(body.data.every((bank) => !bank.service_status))
})

Then('the response data should not be wrapped in an array', function (this: OBWorld) {
  const body = this.lastResponse.json<unknown>()
  assert.ok(!Array.isArray(body))
  assert.equal(typeof body, 'object')
})

Then('the response should not be valid JSON', function (this: OBWorld) {
  assert.throws(() => this.lastResponse.json())
})

Then('the response body should be empty', function (this: OBWorld) {
  assert.equal(this.lastResponse.text(), '')
})

Then('the response error details should be non-empty', function (this: OBWorld) {
  const body = this.lastResponse.json<{ details: Record<string, string[]> }>()
  assert.ok(Object.values(body.details).every((arr) => arr.length > 0))
})

Then(
  'the response should contain the error',
  function (this: OBWorld, table: { rowsHash: () => Record<string, string> }) {
    const { description, error } = table.rowsHash()
    const body = this.lastResponse.json<{ description: string; details: null; error: string }>()
    assert.equal(body.error, error)
    assert.equal(body.description, description)
    assert.equal(body.details, null)
  }
)

Then('the response should contain a valid banks list', function (this: OBWorld) {
  const body = this.lastResponse.json<BanksResponse>()
  assert.ok(Array.isArray(body.data))
  assert.ok(body.data.length > 0)
  const bank = body.data[0]
  assert.ok(bank)
  assert.ok(bank.bank_id)
  assert.ok(bank.name)
  assert.ok(bank.friendly_name)
  assert.equal(typeof bank.is_sandbox, 'boolean')
  assert.equal(typeof bank.service_status, 'boolean')
  assert.ok(bank.abilities)
  assert.ok(body.meta)
  assert.equal(typeof body.meta.total_count, 'number')
})
