import type { BankListUpdateCoordinator } from '@src/bank-list/service/bank-list-update-coordinator'
import type { Context, ScheduledEvent } from 'aws-lambda'

import { handler } from '@src/bank-list/handler/bank-list-updater'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { middlewareOrder } = await vi.hoisted(
  () => import('@test-fixtures/middy/handler-middleware')
)

const { updateAll } = vi.hoisted(() => ({
  updateAll: vi.fn<BankListUpdateCoordinator['updateAll']>()
}))

vi.mock('@govuk-one-login/cri-token-rotator/dynamodb', () => ({
  createDynamoTokenRepository: () => ({ getToken: vi.fn(), putToken: vi.fn() })
}))

vi.mock('@src/bank-list/client/bank-list-repository', () => ({
  createBankListRepository: () => ({ getList: vi.fn(), replaceList: vi.fn() })
}))

vi.mock('@src/bank-list/service/bank-list-update-coordinator', () => ({
  createBankListUpdateCoordinator: () => ({ updateAll })
}))

const buildEvent = (): ScheduledEvent => ({}) as ScheduledEvent

const buildContext = (): Context => ({ functionName: 'bank-list-updater-test' }) as Context

describe('bank-list-updater handler', () => {
  beforeEach(() => {
    updateAll.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('registers the middleware chain in order', () => {
    expect(middlewareOrder).toEqual([
      'latencyRecorder',
      'resultRecorder',
      'injectLambdaContext',
      'logMetrics'
    ])
  })

  it('rethrows when an update fails', async () => {
    updateAll.mockRejectedValue(new Error('Bank list update(s) failed for: STUB'))

    await expect(handler(buildEvent(), buildContext())).rejects.toThrow(
      'Bank list update(s) failed for: STUB'
    )
  })
})
