import type { SessionItem } from '@govuk-one-login/cri-types'
import type { ConsentEntity } from '@src/consents/model/database/consent-entity'

import { BadRequestError } from '@common/error/bad-request-error'
import { SessionNotFoundError } from '@common/error/session-not-found-error'
import { EndpointProfile } from '@common/model/endpoint-profile'
import { OAuthClientId } from '@common/model/oauth-client-id'
import { createConsentsService } from '@src/consents/service/consents-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ACCESS_TOKEN = 'test-access-token'
const CONSENTS_CONFIG_PATH_PREFIX = '/prefix/consents'
const ENDPOINT_URL = 'https://ecospend.test/consents'
const NOW_SECONDS = 690_811_200
const SESSION_ID = 'session-123'

const eventBody = JSON.stringify({
  bank_id: 'iron-bank',
  return_url: 'https://return.test/callback'
})

const createdConsent = {
  bankConsentUrl: 'https://bank.test/consent/abc',
  bankId: 'iron-bank',
  consentId: 'consent-abc'
}

const buildSession = (clientId: string = OAuthClientId.IPV_CORE_STUB): SessionItem =>
  ({
    clientId,
    clientSessionId: OAuthClientId.IPV_CORE_STUB_AWS_HEADLESS,
    sessionId: SESSION_ID
  }) as SessionItem

const buildConsentEntity = (overrides: Partial<ConsentEntity> = {}): ConsentEntity => ({
  bankConsentUrl: 'https://bank.test/consent/cached',
  bankConsentUrlExpirySeconds: NOW_SECONDS + 240,
  bankId: 'iron-bank',
  consentId: 'cached',
  sessionId: SESSION_ID,
  ttl: NOW_SECONDS + 7200,
  ...overrides
})

const buildTestContext = () => {
  const createConsent = vi.fn().mockResolvedValue(createdConsent)
  const findBySessionId = vi.fn().mockResolvedValue(buildSession())
  const getExternalConfig = vi.fn().mockResolvedValue({ 'endpoint-url': ENDPOINT_URL })
  const getConsent = vi.fn().mockResolvedValue(undefined)
  const putConsent = vi.fn().mockResolvedValue(undefined)
  const retrieveToken = vi.fn().mockResolvedValue(ACCESS_TOKEN)

  const consentsService = createConsentsService(
    { consentsConfigPathPrefix: CONSENTS_CONFIG_PATH_PREFIX },
    {
      consentsProvider: { createConsent },
      consentsRepository: { getConsent, putConsent },
      externalConfigProvider: { get: getExternalConfig },
      sessionRepository: { findByAccessToken: vi.fn(), findBySessionId },
      tokenRetrievalService: { retrieveToken }
    }
  )

  return {
    consentsService,
    createConsent,
    findBySessionId,
    getExternalConfig,
    getConsent,
    putConsent,
    retrieveToken
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW_SECONDS * 1000)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createConsentsService', () => {
  it('returns our response from the created consent', async () => {
    const { consentsService } = buildTestContext()

    await expect(consentsService({ eventBody, sessionId: SESSION_ID })).resolves.toEqual({
      id: 'consent-abc',
      url: 'https://bank.test/consent/abc',
      urlExpirySeconds: NOW_SECONDS + 240
    })
  })

  it('resolves the profile, config and token before calling the provider', async () => {
    const { consentsService, createConsent } = buildTestContext()

    await consentsService({ eventBody, sessionId: SESSION_ID })

    expect(createConsent).toHaveBeenCalledWith({
      accessToken: ACCESS_TOKEN,
      bankId: 'iron-bank',
      endpointUrl: ENDPOINT_URL,
      profile: EndpointProfile.STUB,
      returnUrl: 'https://return.test/callback'
    })
  })

  it('reads the config for the profile the session maps to', async () => {
    const { consentsService, createConsent, findBySessionId, getExternalConfig } =
      buildTestContext()
    findBySessionId.mockResolvedValue(buildSession(OAuthClientId.IPV_CORE))

    await consentsService({ eventBody, sessionId: SESSION_ID })

    expect(getExternalConfig).toHaveBeenCalledWith(
      `${CONSENTS_CONFIG_PATH_PREFIX}/${EndpointProfile.LIVE}`
    )
    expect(createConsent).toHaveBeenCalledWith(
      expect.objectContaining({ profile: EndpointProfile.LIVE })
    )
  })

  it('stores the new consent', async () => {
    const { consentsService, putConsent } = buildTestContext()

    await consentsService({ eventBody, sessionId: SESSION_ID })

    expect(putConsent).toHaveBeenCalledWith({
      bankConsentUrl: 'https://bank.test/consent/abc',
      bankConsentUrlExpirySeconds: NOW_SECONDS + 240,
      bankId: 'iron-bank',
      consentId: 'consent-abc',
      sessionId: SESSION_ID,
      ttl: NOW_SECONDS + 7200
    })
  })

  it('returns a cached consent when its url is still fresh', async () => {
    const { consentsService, createConsent, getConsent, putConsent } = buildTestContext()
    getConsent.mockResolvedValue(
      buildConsentEntity({ bankConsentUrlExpirySeconds: NOW_SECONDS + 100 })
    )

    await expect(consentsService({ eventBody, sessionId: SESSION_ID })).resolves.toEqual({
      cached: true,
      id: 'cached',
      url: 'https://bank.test/consent/cached',
      urlExpirySeconds: NOW_SECONDS + 100
    })

    expect(createConsent).not.toHaveBeenCalled()
    expect(putConsent).not.toHaveBeenCalled()
  })

  it('creates a new consent when the cached url has expired', async () => {
    const { consentsService, getConsent } = buildTestContext()
    getConsent.mockResolvedValue(
      buildConsentEntity({ bankConsentUrlExpirySeconds: NOW_SECONDS - 1 })
    )

    await expect(consentsService({ eventBody, sessionId: SESSION_ID })).resolves.toEqual({
      id: 'consent-abc',
      url: 'https://bank.test/consent/abc',
      urlExpirySeconds: NOW_SECONDS + 240
    })
  })

  it('creates a new consent when the cached consent is for another bank', async () => {
    const { consentsService, getConsent } = buildTestContext()
    getConsent.mockResolvedValue(
      buildConsentEntity({ bankConsentUrlExpirySeconds: NOW_SECONDS + 100, bankId: 'other-bank' })
    )

    await expect(consentsService({ eventBody, sessionId: SESSION_ID })).resolves.toEqual({
      id: 'consent-abc',
      url: 'https://bank.test/consent/abc',
      urlExpirySeconds: NOW_SECONDS + 240
    })
  })

  it('rejects an unknown session', async () => {
    const { consentsService, createConsent, findBySessionId } = buildTestContext()
    findBySessionId.mockResolvedValue(undefined)

    await expect(consentsService({ eventBody, sessionId: SESSION_ID })).rejects.toThrow(
      SessionNotFoundError
    )

    expect(createConsent).not.toHaveBeenCalled()
  })

  it('rejects a request body missing a required field', async () => {
    const { consentsService, createConsent } = buildTestContext()

    await expect(
      consentsService({
        eventBody: JSON.stringify({ bank_id: 'iron-bank' }),
        sessionId: SESSION_ID
      })
    ).rejects.toThrow(BadRequestError)

    expect(createConsent).not.toHaveBeenCalled()
  })

  it('rejects a request body that is not valid JSON', async () => {
    const { consentsService, createConsent } = buildTestContext()

    await expect(
      consentsService({ eventBody: '{not json', sessionId: SESSION_ID })
    ).rejects.toThrow('Request body is not valid JSON')

    expect(createConsent).not.toHaveBeenCalled()
  })

  it('rejects a missing request body', async () => {
    const { consentsService, createConsent } = buildTestContext()

    await expect(consentsService({ eventBody: null, sessionId: SESSION_ID })).rejects.toThrow(
      BadRequestError
    )

    expect(createConsent).not.toHaveBeenCalled()
  })

  it('rejects invalid external config', async () => {
    const { consentsService, createConsent, getExternalConfig } = buildTestContext()
    getExternalConfig.mockResolvedValue({ 'some-other-key': 'value' })

    await expect(consentsService({ eventBody, sessionId: SESSION_ID })).rejects.toThrow(
      'Invalid consents request config'
    )

    expect(createConsent).not.toHaveBeenCalled()
  })

  it('rejects when no token is available for the profile', async () => {
    const { consentsService, createConsent, retrieveToken } = buildTestContext()
    retrieveToken.mockResolvedValue(undefined)

    await expect(consentsService({ eventBody, sessionId: SESSION_ID })).rejects.toThrow(
      'No token is available'
    )

    expect(createConsent).not.toHaveBeenCalled()
  })
})
