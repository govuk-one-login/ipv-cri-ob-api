import type { IdentityScoreRepository } from '@common/client/identity-score-repository'
import type { PersonIdentityRepository } from '@common/client/person-identity-repository'
import type { SessionRepository } from '@common/client/session-repository'
import type { AuditEventPublisher } from '@common/service/audit-event-publisher'
import type { PersonIdentityItem, SessionItem } from '@govuk-one-login/cri-types'
import type { IdentityCheckCredentialJWTClass } from '@govuk-one-login/data-vocab/credentials'
import type { IdentityScore } from '@src/issue-credential/model/identity-score'
import type {
  JwtEnvelopeClaims,
  JwtEnvelopeGenerator
} from '@src/issue-credential/service/jwt-envelope-generator'
import type { VerifiableCredentialBuilder } from '@src/issue-credential/service/verifiable-credential-builder'
import type { VerifiableCredentialSigner } from '@src/issue-credential/service/verifiable-credential-signer'
import type { MockInstance } from 'vitest'

import { SessionNotFoundError } from '@common/error/session-not-found-error'
import { logger } from '@govuk-one-login/cri-logger'
import { IdentityScoreNotFoundError, PersonDetailsNotFoundError } from '@src/issue-credential/error'
import { createIssueCredentialService } from '@src/issue-credential/service/issue-credential-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const buildSession = (overrides: Partial<SessionItem> = {}): SessionItem =>
  ({
    clientId: 'test-client',
    clientSessionId: 'client-session-1',
    sessionId: 'session-123',
    subject: 'subject-xyz',
    ...overrides
  }) as SessionItem

const buildPersonDetails = (): PersonIdentityItem =>
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
    sessionId: 'session-123'
  }) as PersonIdentityItem

const buildIdentityScore = (): IdentityScore => ({
  checkDetails: ['data', 'auth'],
  contraIndicators: [],
  failedCheckDetails: [],
  sessionId: 'session-123',
  strengthScore: 3,
  transactionId: 'txn-1',
  ttl: 0,
  validityScore: 2,
  verificationScore: 3
})

const buildEnvelope = (): JwtEnvelopeClaims => ({
  exp: 1,
  iss: 'iss',
  jti: 'jti',
  nbf: 0,
  sub: 'subject-xyz'
})

const buildClaimSet = (): IdentityCheckCredentialJWTClass => ({
  exp: 1,
  iss: 'iss',
  jti: 'jti',
  nbf: 0,
  sub: 'subject-xyz',
  vc: {
    credentialSubject: {},
    evidence: [{ type: 'IdentityCheck' }],
    type: ['VerifiableCredential', 'IdentityCheckCredential']
  }
})

const buildCollaborators = () => ({
  auditEventPublisher: {
    publishJourneyEnd: vi
      .fn<AuditEventPublisher['publishJourneyEnd']>()
      .mockResolvedValue(undefined),
    publishVCIssued: vi.fn<AuditEventPublisher['publishVCIssued']>().mockResolvedValue(undefined)
  },
  identityScoreRepository: {
    findBySessionId: vi
      .fn<IdentityScoreRepository['findBySessionId']>()
      .mockResolvedValue(buildIdentityScore())
  },
  jwtEnvelopeGenerator: {
    generate: vi.fn<JwtEnvelopeGenerator['generate']>().mockReturnValue(buildEnvelope())
  },
  personDetailsRepository: {
    findBySessionId: vi
      .fn<PersonIdentityRepository['findBySessionId']>()
      .mockResolvedValue(buildPersonDetails())
  },
  sessionRepository: {
    findByAccessToken: vi
      .fn<SessionRepository['findByAccessToken']>()
      .mockResolvedValue(buildSession()),
    findBySessionId: vi.fn<SessionRepository['findBySessionId']>()
  },
  verifiableCredentialBuilder: {
    build: vi.fn<VerifiableCredentialBuilder['build']>().mockReturnValue(buildClaimSet())
  },
  verifiableCredentialSigner: {
    sign: vi.fn<VerifiableCredentialSigner['sign']>().mockResolvedValue('signed.jwt.value')
  }
})

describe('issue-credential-service', () => {
  let collaborators: ReturnType<typeof buildCollaborators>
  let infoSpy: MockInstance<typeof logger.info>
  let appendKeysSpy: MockInstance<typeof logger.appendKeys>

  beforeEach(() => {
    collaborators = buildCollaborators()
    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})
    appendKeysSpy = vi.spyOn(logger, 'appendKeys').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws SessionNotFoundError when the access token has no session', async () => {
    collaborators.sessionRepository.findByAccessToken.mockResolvedValue(undefined)

    await expect(
      createIssueCredentialService(collaborators)({ accessToken: 'abc.def.ghi' })
    ).rejects.toBeInstanceOf(SessionNotFoundError)

    expect(collaborators.sessionRepository.findByAccessToken).toHaveBeenCalledWith('abc.def.ghi')
    expect(collaborators.personDetailsRepository.findBySessionId).not.toHaveBeenCalled()
    expect(collaborators.identityScoreRepository.findBySessionId).not.toHaveBeenCalled()
  })

  it('throws PersonDetailsNotFoundError when person details are missing', async () => {
    collaborators.personDetailsRepository.findBySessionId.mockResolvedValue(undefined)

    await expect(
      createIssueCredentialService(collaborators)({ accessToken: 'abc.def.ghi' })
    ).rejects.toBeInstanceOf(PersonDetailsNotFoundError)

    expect(collaborators.verifiableCredentialBuilder.build).not.toHaveBeenCalled()
    expect(collaborators.verifiableCredentialSigner.sign).not.toHaveBeenCalled()
    expect(collaborators.auditEventPublisher.publishVCIssued).not.toHaveBeenCalled()
    expect(collaborators.auditEventPublisher.publishJourneyEnd).not.toHaveBeenCalled()
  })

  it('throws IdentityScoreNotFoundError when the identity score is missing', async () => {
    collaborators.identityScoreRepository.findBySessionId.mockResolvedValue(undefined)

    await expect(
      createIssueCredentialService(collaborators)({ accessToken: 'abc.def.ghi' })
    ).rejects.toBeInstanceOf(IdentityScoreNotFoundError)

    expect(collaborators.verifiableCredentialBuilder.build).not.toHaveBeenCalled()
    expect(collaborators.verifiableCredentialSigner.sign).not.toHaveBeenCalled()
    expect(collaborators.auditEventPublisher.publishVCIssued).not.toHaveBeenCalled()
    expect(collaborators.auditEventPublisher.publishJourneyEnd).not.toHaveBeenCalled()
  })

  it('builds, signs and returns the credential on the happy path', async () => {
    await expect(
      createIssueCredentialService(collaborators)({ accessToken: 'abc.def.ghi' })
    ).resolves.toEqual({ credential: 'signed.jwt.value' })

    expect(collaborators.personDetailsRepository.findBySessionId).toHaveBeenCalledWith(
      'session-123'
    )
    expect(collaborators.identityScoreRepository.findBySessionId).toHaveBeenCalledWith(
      'session-123'
    )
    expect(collaborators.jwtEnvelopeGenerator.generate).toHaveBeenCalledWith('subject-xyz')
    expect(collaborators.verifiableCredentialBuilder.build).toHaveBeenCalledWith({
      envelope: buildEnvelope(),
      identityScore: buildIdentityScore(),
      personDetails: buildPersonDetails()
    })
    expect(collaborators.verifiableCredentialSigner.sign).toHaveBeenCalledWith(buildClaimSet())
  })

  it('appends session identifiers to the logger context', async () => {
    await createIssueCredentialService(collaborators)({ accessToken: 'abc.def.ghi' })

    expect(appendKeysSpy).toHaveBeenCalledWith({
      cri_session_id: 'session-123',
      govuk_signin_journey_id: 'client-session-1'
    })
    expect(infoSpy).toHaveBeenCalledWith('Session retrieved')
  })

  it('publishes vc-issued and journey-end audit events', async () => {
    const session = buildSession()
    collaborators.sessionRepository.findByAccessToken.mockResolvedValue(session)

    await createIssueCredentialService(collaborators)({ accessToken: 'abc.def.ghi' })

    expect(collaborators.auditEventPublisher.publishVCIssued).toHaveBeenCalledWith({ session })
    expect(collaborators.auditEventPublisher.publishJourneyEnd).toHaveBeenCalledWith({ session })
  })
})
