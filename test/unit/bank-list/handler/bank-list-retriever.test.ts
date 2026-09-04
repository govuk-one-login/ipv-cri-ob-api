import type { BankListEntity } from '@src/bank-list/model/bank-list'
import type { BankListRetrievalService } from '@src/bank-list/service/bank-list-retrieval-service'
import type { APIGatewayProxyEvent, Context } from 'aws-lambda'

import { handler } from '@src/bank-list/handler/bank-list-retriever'
import { BanksEndpointProfile } from '@src/bank-list/model/bank-list'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { bankListRetrievalService } = vi.hoisted(() => ({
  bankListRetrievalService: vi.fn<BankListRetrievalService>()
}))

vi.mock('@src/bank-list/client/bank-list-repository', () => ({
  getBankListRepository: () => ({ getList: vi.fn(), replaceList: vi.fn() })
}))

vi.mock('@src/common/client/session-repository', () => ({
  getSessionRepository: () => ({ findByAccessToken: vi.fn(), findBySessionId: vi.fn() })
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
  profile: BanksEndpointProfile.STUB,
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
})
