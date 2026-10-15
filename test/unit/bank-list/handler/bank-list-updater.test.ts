import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type { BankListUpdateCoordinator } from '@src/bank-list/service/bank-list-update-coordinator'
import type { Context, ScheduledEvent } from 'aws-lambda'

import { MetricUnit } from '@govuk-one-login/cri-metrics'
import { handler } from '@src/bank-list/handler/bank-list-updater'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as criMetrics from '@govuk-one-login/cri-metrics'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

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

  describe('metrics', () => {
    it('emits lambda_result=success and lambda_latency_ms when all updates succeed', async () => {
      updateAll.mockResolvedValue(undefined)

      await handler(buildEvent(), buildContext())

      expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
        'lambda_result',
        { lambda: 'bank-list-updater-test', result: 'success' },
        1,
        MetricUnit.Count
      )
      expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
        'lambda_latency_ms',
        {
          lambda: 'bank-list-updater-test',
          start_state: expect.toBeOneOf(['cold', 'hot']) as string
        },
        expect.any(Number),
        MetricUnit.Milliseconds
      )
    })

    it('emits lambda_result=error and lambda_latency_ms when an update fails', async () => {
      updateAll.mockRejectedValue(new Error('Bank list update(s) failed for: STUB'))

      await expect(handler(buildEvent(), buildContext())).rejects.toThrow(
        'Bank list update(s) failed for: STUB'
      )

      expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
        'lambda_result',
        { lambda: 'bank-list-updater-test', result: 'error' },
        1,
        MetricUnit.Count
      )
      expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
        'lambda_latency_ms',
        {
          lambda: 'bank-list-updater-test',
          start_state: expect.toBeOneOf(['cold', 'hot'])
        },
        expect.any(Number),
        MetricUnit.Milliseconds
      )
    })
  })
})
