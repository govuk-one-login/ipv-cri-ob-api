import type { OBWorld } from '../world.js'

import { Then } from '@cucumber/cucumber'

import assert from 'node:assert/strict'

Then('the response status should be {int}', function (this: OBWorld, expectedStatus: number) {
  assert.equal(this.lastResponse.status(), expectedStatus)
})

Then(
  'the response body field {string} should be {int}',
  function (this: OBWorld, field: string, expected: number) {
    const body = this.lastResponse.json<Record<string, unknown>>()
    assert.equal(body[field], expected)
  }
)

Then(
  'the response body field {string} should be {string}',
  function (this: OBWorld, field: string, expected: string) {
    const body = this.lastResponse.json<Record<string, unknown>>()
    assert.equal(String(body[field]), expected)
  }
)

Then('the response body should be empty', function (this: OBWorld) {
  assert.equal(this.lastResponse.text(), '')
})

Then('the response body should be a valid JWT', function (this: OBWorld) {
  const parts = this.lastResponse.text().split('.')
  assert.equal(parts.length, 3, 'Expected a JWT with 3 dot-separated parts')
})

Then('the response body should have field {string}', function (this: OBWorld, field: string) {
  const body = this.lastResponse.json<Record<string, unknown>>()
  assert.ok(Object.hasOwn(body, field), `Response should have field: ${field}`)
})

Then(
  'the response body field {string} should have key {string}',
  function (this: OBWorld, field: string, key: string) {
    const body = this.lastResponse.json<Record<string, Record<string, unknown>>>()
    const nested = body[field]
    if (!nested) throw new Error(`Response should have field: ${field}`)
    assert.ok(Object.hasOwn(nested, key), `Field "${field}" should have key: ${key}`)
  }
)

Then(
  'the response body field {string} should have key {string} with value {string}',
  function (this: OBWorld, field: string, key: string, value: string) {
    const body = this.lastResponse.json<Record<string, Record<string, string[]>>>()
    const nested = body[field]
    if (!nested) throw new Error(`Response should have field: ${field}`)
    assert.ok(Object.hasOwn(nested, key), `Field "${field}" should have key: ${key}`)
    assert.ok(
      nested[key]?.includes(value),
      `Field "${field}.${key}" should contain value: ${value}`
    )
  }
)
