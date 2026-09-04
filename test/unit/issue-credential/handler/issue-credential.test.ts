import type { IdentityScoreRepository } from '@common/client/identity-score-repository'
import type { PersonIdentityRepository } from '@common/client/person-identity-repository'
import type { SessionRepository } from '@common/client/session-repository'
import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type { IssueCredentialService } from '@src/issue-credential/service/issue-credential-service'
import type { APIGatewayProxyEvent, Context } from 'aws-lambda'

import { SessionNotFoundError } from '@common/error/session-not-found-error'
import { MetricUnit } from '@govuk-one-login/cri-metrics'
import { IdentityScoreNotFoundError, PersonDetailsNotFoundError } from '@src/issue-credential/error'
import { handler } from '@src/issue-credential/handler/issue-credential'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as criMetrics from '@govuk-one-login/cri-metrics'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

const { issueCredentialService } = vi.hoisted(() => ({
  issueCredentialService: vi.fn<IssueCredentialService>()
}))

vi.mock('@common/client/session-repository', () => ({
  getSessionRepository: (): SessionRepository => ({
    findByAccessToken: vi.fn(),
    findBySessionId: vi.fn()
  })
}))

vi.mock('@common/client/person-identity-repository', () => ({
  getPersonIdentityRepository: (): PersonIdentityRepository => ({ findBySessionId: vi.fn() })
}))

vi.mock('@common/client/identity-score-repository', () => ({
  getIdentityScoreRepository: (): IdentityScoreRepository => ({ findBySessionId: vi.fn() })
}))

vi.mock('@src/issue-credential/service/issue-credential-service', () => ({
  createIssueCredentialService: () => issueCredentialService
}))

const buildEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    headers: { Authorization: 'Bearer abc.def.ghi' },
    path: '/credential/issue',
    ...overrides
  }) as APIGatewayProxyEvent

const buildContext = (): Context => ({ functionName: 'issue-credential-test' }) as Context

describe('issue-credential handler', () => {
  beforeEach(() => {
    issueCredentialService.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('passes the access token to the service', async () => {
    issueCredentialService.mockResolvedValue({ credential: 'signed.jwt.value' })

    await handler(buildEvent({ headers: { Authorization: 'Bearer my.token' } }), buildContext())

    expect(issueCredentialService).toHaveBeenCalledWith({ accessToken: 'my.token' })
  })

  it('returns 200 with the signed credential as application/jwt', async () => {
    issueCredentialService.mockResolvedValue({ credential: 'signed.jwt.value' })

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(200)
    expect(result.headers?.['Content-Type']).toBe('application/jwt')
    expect(result.body).toBe('signed.jwt.value')
  })

  it('returns 401 when Authorization header is missing', async () => {
    const result = await handler(buildEvent({ headers: {} }), buildContext())

    expect(result.statusCode).toBe(401)
    expect(issueCredentialService).not.toHaveBeenCalled()
  })

  it('returns 401 when Authorization header is not a Bearer token', async () => {
    const result = await handler(
      buildEvent({ headers: { Authorization: 'Basic abc' } }),
      buildContext()
    )

    expect(result.statusCode).toBe(401)
    expect(issueCredentialService).not.toHaveBeenCalled()
  })

  it('returns 401 when the access token does not map to a session', async () => {
    issueCredentialService.mockRejectedValue(new SessionNotFoundError())

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(401)
  })

  it('returns 500 when person details are missing for the session', async () => {
    issueCredentialService.mockRejectedValue(new PersonDetailsNotFoundError())

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(500)
  })

  it('returns 500 when the identity score is missing for the session', async () => {
    issueCredentialService.mockRejectedValue(new IdentityScoreNotFoundError())

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(500)
  })

  it('emits lambda_result=success and lambda_latency_ms on the happy path', async () => {
    issueCredentialService.mockResolvedValue({ credential: 'signed.jwt.value' })

    await handler(buildEvent(), buildContext())

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
      'lambda_result',
      { lambda: 'issue-credential-test', result: 'success' },
      1,
      MetricUnit.Count
    )
    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
      'lambda_latency_ms',
      { lambda: 'issue-credential-test', start_state: expect.toBeOneOf(['cold', 'hot']) as string },
      expect.any(Number),
      MetricUnit.Milliseconds
    )
  })

  it('emits lambda_result=error and lambda_latency_ms when the handler fails', async () => {
    await handler(buildEvent({ headers: {} }), buildContext())

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
      'lambda_result',
      { lambda: 'issue-credential-test', result: 'error' },
      1,
      MetricUnit.Count
    )
    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
      'lambda_latency_ms',
      { lambda: 'issue-credential-test', start_state: expect.toBeOneOf(['cold', 'hot']) as string },
      expect.any(Number),
      MetricUnit.Milliseconds
    )
  })
})
