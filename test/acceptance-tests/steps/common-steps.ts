import type { OBWorld } from '../world.js'

import { Then } from '@cucumber/cucumber'

import assert from 'node:assert/strict'

Then('the response status should be {int}', function (this: OBWorld, expectedStatus: number) {
  assert.equal(this.lastResponse.status(), expectedStatus)
})

Then(
  'the response body field {string} should be {string}',
  function (this: OBWorld, field: string, expected: string) {
    const body = this.lastResponse.json<Record<string, unknown>>()
    assert.equal(String(body[field]), expected)
  }
)

Then('the response body should have field {string}', function (this: OBWorld, field: string) {
  const body = this.lastResponse.json<Record<string, unknown>>()
  assert.ok(Object.hasOwn(body, field), `Response should have field: ${field}`)
})

Then(
  'the response body field {string} should have key {string}',
  function (this: OBWorld, field: string, key: string) {
    const body = this.lastResponse.json<Record<string, Record<string, unknown>>>()
    assert.ok(body[field], `Response should have field: ${field}`)
    assert.ok(Object.hasOwn(body[field], key), `Field "${field}" should have key: ${key}`)
  }
)
