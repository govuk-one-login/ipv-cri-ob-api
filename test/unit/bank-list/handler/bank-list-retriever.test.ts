import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type { BankListEntity } from '@src/bank-list/model/database/bank-list-entity'
import type { BankListRetrievalService } from '@src/bank-list/service/bank-list-retrieval-service'
import type { APIGatewayProxyEvent, Context } from 'aws-lambda'

import { EndpointProfile } from '@common/model/endpoint-profile'
import { MetricUnit } from '@govuk-one-login/cri-metrics'
import { handler } from '@src/bank-list/handler/bank-list-retriever'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as criMetrics from '@govuk-one-login/cri-metrics'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

const { bankListRetrievalService } = vi.hoisted(() => ({
  bankListRetrievalService: vi.fn<BankListRetrievalService>()
}))

vi.mock('@common/client/session-repository', () => ({
  createSessionRepository: () => ({ findByAccessToken: vi.fn(), findBySessionId: vi.fn() })
}))

vi.mock('@src/bank-list/client/bank-list-repository', () => ({
  createBankListRepository: () => ({ getList: vi.fn(), replaceList: vi.fn() })
}))

vi.mock('@src/bank-list/service/bank-list-retrieval-service', () => ({
  createBankListRetrievalService: () => bankListRetrievalService
}))

const buildEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    headers: { 'session-id': 'session-123' },
    ...overrides
  }) as APIGatewayProxyEvent

const buildContext = (): Context => ({ functionName: 'bank-list-retriever-test' }) as Context

const buildBankListEntity = (): BankListEntity => ({
  banks: [{ bankId: 'iron-bank', friendlyName: 'Iron Bank', serviceStatus: true }],
  profile: EndpointProfile.STUB,
  refreshedAtSeconds: 1_800_000_000
})

describe('bank-list-retriever handler', () => {
  beforeEach(() => {
    bankListRetrievalService.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('passes session-id to the service', async () => {
    bankListRetrievalService.mockResolvedValue({ bankList: buildBankListEntity() })

    await handler(buildEvent({ headers: { 'session-id': '  session-abc  ' } }), buildContext())

    expect(bankListRetrievalService).toHaveBeenCalledWith({ sessionId: 'session-abc' })
  })

  it('returns 200 bank list as application/json', async () => {
    const bankList = buildBankListEntity()
    bankListRetrievalService.mockResolvedValue({ bankList })

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(200)
    expect(result.headers?.['Content-Type']).toBe('application/json')
    expect(JSON.parse(result.body)).toEqual(bankList)
  })

  it('returns 401 when the session-id header is missing', async () => {
    const result = await handler(buildEvent({ headers: {} }), buildContext())

    expect(result.statusCode).toBe(401)
    expect(bankListRetrievalService).not.toHaveBeenCalled()
  })

  it('returns 204 empty body when no bank list is available', async () => {
    bankListRetrievalService.mockResolvedValue({ bankList: undefined })

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(204)
    expect(result.body).toBe('')
  })

  it('returns 500 when the service throws an unexpected error', async () => {
    bankListRetrievalService.mockRejectedValue(new Error('crumbs'))

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(500)
  })

  describe('metrics', () => {
    it('emits lambda_result=success and lambda_latency_ms on the happy path', async () => {
      bankListRetrievalService.mockResolvedValue({ bankList: buildBankListEntity() })

      await handler(buildEvent(), buildContext())

      expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
        'lambda_result',
        { lambda: 'bank-list-retriever-test', result: 'success' },
        1,
        MetricUnit.Count
      )
      expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
        'lambda_latency_ms',
        {
          lambda: 'bank-list-retriever-test',
          start_state: expect.toBeOneOf(['cold', 'hot']) as string
        },
        expect.any(Number),
        MetricUnit.Milliseconds
      )
    })

    it('emits lambda_result=error and lambda_latency_ms when the handler fails', async () => {
      bankListRetrievalService.mockRejectedValue(new Error('crumbs'))

      await handler(buildEvent(), buildContext())

      expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
        'lambda_result',
        { lambda: 'bank-list-retriever-test', result: 'error' },
        1,
        MetricUnit.Count
      )
      expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
        'lambda_latency_ms',
        { lambda: 'bank-list-retriever-test', start_state: expect.toBeOneOf(['cold', 'hot']) },
        expect.any(Number),
        MetricUnit.Milliseconds
      )
    })
  })
})
