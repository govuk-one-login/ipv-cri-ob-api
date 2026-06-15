import type { OBWorld } from '../world.js'
import type { IdentityCheckCredentialJWTClass } from '@govuk-one-login/data-vocab/credentials'

import { Then, When } from '@cucumber/cucumber'

import assert from 'node:assert/strict'

const decodeJwtPayload = (jwt: string): IdentityCheckCredentialJWTClass => {
  const part = jwt.split('.')[1]
  if (!part) throw new Error('Invalid JWT: missing payload segment')
  return JSON.parse(
    Buffer.from(part, 'base64url').toString('utf8')
  ) as IdentityCheckCredentialJWTClass
}

const getPayload = (world: OBWorld): IdentityCheckCredentialJWTClass =>
  decodeJwtPayload(world.lastResponse.text())

Then('the JWT issuer should be present', function (this: OBWorld) {
  const { iss } = getPayload(this)
  assert.ok(typeof iss === 'string' && iss.length > 0)
})

Then('the JWT subject should be present', function (this: OBWorld) {
  const { sub } = getPayload(this)
  assert.ok(typeof sub === 'string' && sub.length > 0)
})

Then('the JWT id should be a urn:uuid', function (this: OBWorld) {
  assert.ok(getPayload(this).jti?.startsWith('urn:uuid:'))
})

Then('the JWT time window should be valid', function (this: OBWorld) {
  const { exp, nbf } = getPayload(this)
  assert.ok(nbf !== undefined && exp !== undefined && nbf < exp)
})

Then(
  'the JWT vc type should be VerifiableCredential and IdentityCheckCredential',
  function (this: OBWorld) {
    assert.deepEqual(getPayload(this).vc.type, ['VerifiableCredential', 'IdentityCheckCredential'])
  }
)

Then('the JWT vc credentialSubject should contain a valid birthDate', function (this: OBWorld) {
  const { credentialSubject } = getPayload(this).vc
  const [birthDate] = credentialSubject?.birthDate ?? []
  if (!birthDate) throw new Error('credentialSubject.birthDate[0] is missing')
  assert.match(birthDate.value, /^\d{4}-\d{2}-\d{2}$/)
})

Then(
  'the JWT vc credentialSubject should contain a GivenName and FamilyName',
  function (this: OBWorld) {
    const { credentialSubject } = getPayload(this).vc
    const [name] = credentialSubject?.name ?? []
    if (!name) throw new Error('credentialSubject.name[0] is missing')
    assert.ok(name.nameParts.some((p: { type: string }) => p.type === 'GivenName'))
    assert.ok(name.nameParts.some((p: { type: string }) => p.type === 'FamilyName'))
  }
)

Then('the JWT vc evidence should contain a valid IdentityCheck', function (this: OBWorld) {
  const [evidence] = getPayload(this).vc.evidence
  if (!evidence) throw new Error('evidence[0] is missing')
  assert.equal(evidence.type, 'IdentityCheck')
  assert.ok(Array.isArray(evidence.ci))
  assert.ok(Array.isArray(evidence.failedCheckDetails))
  assert.ok(typeof evidence.strengthScore === 'number')
  assert.ok(typeof evidence.validityScore === 'number')
  assert.ok(typeof evidence.verificationScore === 'number')
  assert.ok(typeof evidence.txn === 'string' && evidence.txn.length > 0)
  assert.ok(evidence.checkDetails?.every((c) => typeof c.checkMethod === 'string'))
})

When('I issue a credential', async function (this: OBWorld) {
  this.lastResponse = await this.issueCredential.issueCredential()
})

When('I issue a credential without a token', async function (this: OBWorld) {
  this.lastResponse = await this.issueCredential.issueCredential({ headers: {} })
})

When('I issue a credential with an invalid token', async function (this: OBWorld) {
  this.lastResponse = await this.issueCredential.issueCredential({
    headers: { Authorization: 'Bearer invalid_token' }
  })
})

When('I issue a credential with an expired token', async function (this: OBWorld) {
  this.lastResponse = await this.issueCredential.issueCredential({
    headers: { Authorization: 'Bearer expired_token' }
  })
})
