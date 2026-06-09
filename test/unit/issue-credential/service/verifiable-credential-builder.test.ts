import type { PersonIdentityItem } from '@govuk-one-login/cri-types'
import type { IdentityScore } from '@src/issue-credential/model/identity-score'
import type { JwtEnvelopeClaims } from '@src/issue-credential/service/jwt-envelope-generator'

import { verifiableCredentialBuilder } from '@src/issue-credential/service/verifiable-credential-builder'
import { describe, expect, it } from 'vitest'

const buildEnvelope = (): JwtEnvelopeClaims => ({
  exp: 1337,
  iss: 'https://issuer.example.test',
  jti: 'urn:uuid:test',
  nbf: 0,
  sub: 'subject-xyz'
})

const buildPersonDetails = (overrides: Partial<PersonIdentityItem> = {}): PersonIdentityItem =>
  ({
    birthDates: [{ value: '1867-01-01' }],
    expiryDate: 0,
    names: [
      {
        nameParts: [
          { type: 'GivenName', value: 'Scrooge' },
          { type: 'FamilyName', value: 'McDuck' }
        ]
      }
    ],
    sessionId: 'session-123',
    ...overrides
  }) as PersonIdentityItem

const buildIdentityScore = (overrides: Partial<IdentityScore> = {}): IdentityScore => ({
  checkDetails: ['data', 'auth'],
  contraIndicators: [],
  failedCheckDetails: [],
  sessionId: 'session-123',
  strengthScore: 2,
  transactionId: 'TX000000000000',
  ttl: 0,
  validityScore: 2,
  verificationScore: 2,
  ...overrides
})

const build = (
  overrides: { identityScore?: IdentityScore; personDetails?: PersonIdentityItem } = {}
) =>
  verifiableCredentialBuilder.build({
    envelope: buildEnvelope(),
    identityScore: overrides.identityScore ?? buildIdentityScore(),
    personDetails: overrides.personDetails ?? buildPersonDetails()
  })

describe('verifiable-credential-builder', () => {
  it('spreads envelope claims onto the top level of the credential', () => {
    const result = build()

    expect(result).toMatchObject({
      exp: 1337,
      iss: 'https://issuer.example.test',
      jti: 'urn:uuid:test',
      nbf: 0,
      sub: 'subject-xyz'
    })
  })

  it('sets the credential type to VerifiableCredential and IdentityCheckCredential', () => {
    const result = build()

    expect(result.vc.type).toEqual(['VerifiableCredential', 'IdentityCheckCredential'])
  })

  it('maps person birthDates onto credentialSubject.birthDate', () => {
    const result = build()

    expect(result.vc.credentialSubject?.birthDate).toEqual([{ value: '1867-01-01' }])
  })

  it('omits credentialSubject.birthDate when birthDates is absent', () => {
    const personDetails = buildPersonDetails()
    delete personDetails.birthDates

    const result = build({ personDetails })

    expect(result.vc.credentialSubject).not.toHaveProperty('birthDate')
  })

  it('omits credentialSubject.name when names is absent', () => {
    const personDetails = buildPersonDetails()
    delete personDetails.names

    const result = build({ personDetails })

    expect(result.vc.credentialSubject).not.toHaveProperty('name')
  })

  it('maps PersonIdentityName into a NameClass with the same nameParts', () => {
    const personDetails = buildPersonDetails()

    const result = build({ personDetails })

    expect(result.vc.credentialSubject?.name).toEqual([
      {
        nameParts: [
          { type: 'GivenName', value: 'Scrooge' },
          { type: 'FamilyName', value: 'McDuck' }
        ]
      }
    ])
  })

  it('throws when a name part has an unrecognised type', () => {
    const personDetails = buildPersonDetails({
      names: [{ nameParts: [{ type: 'MiddleName', value: 'Q' }] }]
    })

    expect(() => build({ personDetails })).toThrow('Unexpected name part type: "MiddleName"')
  })

  it('produces one IdentityCheck evidence entry', () => {
    const result = build()

    expect(result.vc.evidence).toHaveLength(1)
    expect(result.vc.evidence?.[0]?.type).toBe('IdentityCheck')
  })

  it('maps identity score numeric fields onto evidence', () => {
    const identityScore = buildIdentityScore({
      strengthScore: 3,
      validityScore: 2,
      verificationScore: 0
    })

    const result = build({ identityScore })

    expect(result.vc.evidence?.[0]).toMatchObject({
      strengthScore: 3,
      txn: 'TX000000000000',
      validityScore: 2,
      verificationScore: 0
    })
  })

  it('maps contraIndicators onto evidence.ci', () => {
    const identityScore = buildIdentityScore({ contraIndicators: ['DXX', 'VXX'] })

    const result = build({ identityScore })

    expect(result.vc.evidence?.[0]?.ci).toEqual(['DXX', 'VXX'])
  })

  it('maps "data" check methods to identityCheckPolicy "none"', () => {
    const identityScore = buildIdentityScore({ checkDetails: ['data'], failedCheckDetails: [] })

    const result = build({ identityScore })

    expect(result.vc.evidence?.[0]?.checkDetails).toEqual([
      { checkMethod: 'data', identityCheckPolicy: 'none' }
    ])
  })

  it('maps "auth" check methods without an identityCheckPolicy', () => {
    const identityScore = buildIdentityScore({ checkDetails: ['auth'], failedCheckDetails: [] })

    const result = build({ identityScore })

    expect(result.vc.evidence?.[0]?.checkDetails).toEqual([{ checkMethod: 'auth' }])
  })

  it('maps failedCheckDetails the same way as checkDetails', () => {
    const identityScore = buildIdentityScore({
      checkDetails: [],
      failedCheckDetails: ['data', 'auth']
    })

    const result = build({ identityScore })

    expect(result.vc.evidence?.[0]?.failedCheckDetails).toEqual([
      { checkMethod: 'data', identityCheckPolicy: 'none' },
      { checkMethod: 'auth' }
    ])
  })

  it('throws when a check method is unrecognised', () => {
    const identityScore = buildIdentityScore({ checkDetails: ['Chickity-check yourself'] })

    expect(() => build({ identityScore })).toThrow(
      'Unexpected check method: "Chickity-check yourself"'
    )
  })
})
