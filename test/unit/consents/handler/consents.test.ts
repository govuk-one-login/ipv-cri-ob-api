import type { ConsentsService } from '@src/consents/service/consents-service'
import type { APIGatewayProxyEvent, Context } from 'aws-lambda'

import { BadRequestError } from '@common/error/bad-request-error'
import { SessionNotFoundError } from '@common/error/session-not-found-error'
import { handler } from '@src/consents/handler/consents'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { consentsService } = vi.hoisted(() => ({
  consentsService: vi.fn<ConsentsService>()
}))

vi.mock('@common/client/session-repository', () => ({
  createSessionRepository: () => ({ findByAccessToken: vi.fn(), findBySessionId: vi.fn() })
}))

vi.mock('@lib/token-rotator/client/dynamo-token-repository', () => ({
  createDynamoTokenRepository: () => ({ getToken: vi.fn(), putToken: vi.fn() })
}))

vi.mock('@src/consents/client/consents-repository', () => ({
  createConsentsRepository: () => ({ getConsent: vi.fn(), putConsent: vi.fn() })
}))

vi.mock('@src/consents/service/consents-service', () => ({
  createConsentsService: () => consentsService
}))

const eventBody = JSON.stringify({
  bank_id: 'iron-bank',
  return_url: 'https://return.test/callback'
})

const buildEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    body: eventBody,
    headers: { 'session-id': 'session-123' },
    ...overrides
  }) as APIGatewayProxyEvent

const buildContext = () => ({ functionName: 'consents' }) as Context

const newConsent = {
  id: 'consent-abc',
  url: 'https://iron.bank.test/consent/abc',
  urlExpirySeconds: 690_811_200
}

describe('consents handler', () => {
  beforeEach(() => {
    consentsService.mockReset()
    consentsService.mockResolvedValue(newConsent)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('passes the session-id and raw body to the service', async () => {
    await handler(
      buildEvent({ body: eventBody, headers: { 'session-id': '  session-abc  ' } }),
      buildContext()
    )

    expect(consentsService).toHaveBeenCalledWith({ eventBody, sessionId: 'session-abc' })
  })

  it('returns 201 for a new consent', async () => {
    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(201)
    expect(result.headers?.['Content-Type']).toBe('application/json')
    expect(JSON.parse(result.body)).toEqual(newConsent)
  })

  it('returns 200 for a cached consent', async () => {
    const cachedConsent = { ...newConsent, cached: true }
    consentsService.mockResolvedValue(cachedConsent)

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(200)
    expect(result.headers?.['Content-Type']).toBe('application/json')
    expect(JSON.parse(result.body)).toEqual(cachedConsent)
  })

  it('returns 400 when the service rejects the request body', async () => {
    consentsService.mockRejectedValue(new BadRequestError('bank_id is required'))

    const result = await handler(buildEvent({ body: '{}' }), buildContext())

    expect(result.statusCode).toBe(400)
  })

  it('returns 401 when the session-id header is missing', async () => {
    const result = await handler(buildEvent({ headers: {} }), buildContext())

    expect(result.statusCode).toBe(401)
    expect(consentsService).not.toHaveBeenCalled()
  })

  it('returns 401 when the session is not found', async () => {
    consentsService.mockRejectedValue(new SessionNotFoundError())

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(401)
  })

  it('returns 500 when the service throws an unexpected error', async () => {
    consentsService.mockRejectedValue(new Error('crumbs'))

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(500)
  })
})
