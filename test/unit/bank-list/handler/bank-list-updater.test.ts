import type * as CfnCustomResourceModule from '@common/util/cfn-custom-resource'
import type { BankListUpdateCoordinator } from '@src/bank-list/service/bank-list-update-coordinator'
import type { Context, ScheduledEvent } from 'aws-lambda'

import { handler } from '@src/bank-list/handler/bank-list-updater'
import { buildCfnCustomResourceEvent } from '@test-fixtures/aws/cfn-custom-resource-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { middlewareOrder } = await vi.hoisted(
  () => import('@test-fixtures/middy/handler-middleware')
)

const { updateAll } = vi.hoisted(() => ({
  updateAll: vi.fn<BankListUpdateCoordinator['updateAll']>()
}))

vi.mock('@common/util/cfn-custom-resource', async (importOriginal) => ({
  ...(await importOriginal<typeof CfnCustomResourceModule>()),
  putCustomResourceResponse: vi.fn()
}))

vi.mock('@govuk-one-login/cri-token-rotator/dynamodb', () => ({
  createDynamoTokenRepository: () => ({ getToken: vi.fn(), putToken: vi.fn() })
}))

vi.mock('@src/bank-list/client/bank-list-repository', () => ({
  createBankListRepository: () => ({ getList: vi.fn(), replaceList: vi.fn() })
}))

vi.mock('@src/bank-list/service/bank-list-update-coordinator', () => ({
  createBankListUpdateCoordinator: () => ({ updateAll: updateAll })
}))

const buildContext = (): Context => ({ functionName: 'bank-list-updater-test' }) as Context

const buildScheduledEvent = (): ScheduledEvent => ({}) as ScheduledEvent

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
      'logMetrics',
      'cfnCustomResourceEventResponder'
    ])
  })

  it('calls updateAll without force for a scheduled event', async () => {
    await handler(buildScheduledEvent(), buildContext())

    expect(updateAll).toHaveBeenCalledExactlyOnceWith()
  })

  it('calls updateAll with force for a CloudFormation Create event', async () => {
    await handler(buildCfnCustomResourceEvent('Create'), buildContext())

    expect(updateAll).toHaveBeenCalledExactlyOnceWith({ force: true })
  })

  it('calls updateAll with force for a CloudFormation Update event', async () => {
    await handler(buildCfnCustomResourceEvent('Update'), buildContext())

    expect(updateAll).toHaveBeenCalledExactlyOnceWith({ force: true })
  })

  it('does nothing on a CloudFormation Delete event', async () => {
    await handler(buildCfnCustomResourceEvent('Delete'), buildContext())

    expect(updateAll).not.toHaveBeenCalled()
  })

  it('rethrows when an update fails', async () => {
    updateAll.mockRejectedValue(new Error('Bank list update(s) failed for: STUB'))

    await expect(handler(buildScheduledEvent(), buildContext())).rejects.toThrow(
      'Bank list update(s) failed for: STUB'
    )
  })
})
