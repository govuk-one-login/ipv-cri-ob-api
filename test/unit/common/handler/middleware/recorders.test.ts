import type * as CriMetrics from '@govuk-one-login/cri-metrics'
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { latencyRecorder, resultRecorder } from '@common/handler/middleware/recorders'
import {
  LAMBDA_LATENCY_METRIC_NAME,
  LAMBDA_RESULT_METRIC_NAME,
  LambdaMetricDimensions,
  LambdaResult,
  LambdaStartState
} from '@common/model/metrics/lambda-metrics'
import { MetricUnit } from '@govuk-one-login/cri-metrics'
import { buildMiddyRequest } from '@test-fixtures/middy/request'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as criMetrics from '@govuk-one-login/cri-metrics'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetrics>()),
  captureMetricWithDimensions: vi.fn()
}))

const expectStartStateOnCall = (callIndex: number, expected: LambdaStartState): void => {
  expect(criMetrics.captureMetricWithDimensions).toHaveBeenNthCalledWith(
    callIndex,
    expect.anything(),
    expect.objectContaining({ [LambdaMetricDimensions.START_STATE]: expected }),
    expect.anything(),
    expect.anything()
  )
}

describe('latencyRecorder', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('emits latency in milliseconds for the lambda on success', async () => {
    const recorder = latencyRecorder()
    const request = buildMiddyRequest<APIGatewayProxyEvent, APIGatewayProxyResult>(
      {},
      { functionName: 'test-fn' }
    )

    await recorder.before!(request)
    await recorder.after!(request)

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledExactlyOnceWith(
      LAMBDA_LATENCY_METRIC_NAME,
      {
        [LambdaMetricDimensions.LAMBDA]: 'test-fn',
        [LambdaMetricDimensions.START_STATE]: LambdaStartState.COLD
      },
      expect.any(Number),
      MetricUnit.Milliseconds
    )
  })

  it('emits latency in milliseconds for the lambda on error', async () => {
    const recorder = latencyRecorder()
    const request = buildMiddyRequest<APIGatewayProxyEvent, APIGatewayProxyResult>(
      {},
      { functionName: 'test-fn' }
    )

    await recorder.before!(request)
    await recorder.onError!(request)

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledExactlyOnceWith(
      LAMBDA_LATENCY_METRIC_NAME,
      {
        [LambdaMetricDimensions.LAMBDA]: 'test-fn',
        [LambdaMetricDimensions.START_STATE]: LambdaStartState.COLD
      },
      expect.any(Number),
      MetricUnit.Milliseconds
    )
  })

  it('marks first invoke cold and subsequent hot', async () => {
    const recorder = latencyRecorder()
    const firstRequest = buildMiddyRequest<APIGatewayProxyEvent, APIGatewayProxyResult>({})
    const secondRequest = buildMiddyRequest<APIGatewayProxyEvent, APIGatewayProxyResult>({})
    const thirdRequest = buildMiddyRequest<APIGatewayProxyEvent, APIGatewayProxyResult>({})

    await recorder.before!(firstRequest)
    await recorder.after!(firstRequest)
    await recorder.before!(secondRequest)
    await recorder.after!(secondRequest)
    await recorder.before!(thirdRequest)
    await recorder.after!(thirdRequest)

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledTimes(3)
    expectStartStateOnCall(1, LambdaStartState.COLD)
    expectStartStateOnCall(2, LambdaStartState.HOT)
    expectStartStateOnCall(3, LambdaStartState.HOT)
  })

  it('flips cold to hot on first invoke error', async () => {
    const recorder = latencyRecorder()
    const erroringRequest = buildMiddyRequest<APIGatewayProxyEvent, APIGatewayProxyResult>({})
    const followUpRequest = buildMiddyRequest<APIGatewayProxyEvent, APIGatewayProxyResult>({})

    await recorder.before!(erroringRequest)
    await recorder.onError!(erroringRequest)
    await recorder.before!(followUpRequest)
    await recorder.after!(followUpRequest)

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledTimes(2)
    expectStartStateOnCall(1, LambdaStartState.COLD)
    expectStartStateOnCall(2, LambdaStartState.HOT)
  })

  it('does not emit a latency metric if before() never ran', async () => {
    const recorder = latencyRecorder()

    await recorder.after!(buildMiddyRequest<APIGatewayProxyEvent, APIGatewayProxyResult>({}))

    expect(criMetrics.captureMetricWithDimensions).not.toHaveBeenCalled()
  })
})

describe('resultRecorder', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('emits a success result for the lambda after the handler succeeds', async () => {
    await resultRecorder().after!(
      buildMiddyRequest<APIGatewayProxyEvent, APIGatewayProxyResult>(
        {},
        { functionName: 'test-fn' }
      )
    )

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledExactlyOnceWith(
      LAMBDA_RESULT_METRIC_NAME,
      {
        [LambdaMetricDimensions.LAMBDA]: 'test-fn',
        [LambdaMetricDimensions.RESULT]: LambdaResult.SUCCESS
      },
      1,
      MetricUnit.Count
    )
  })

  it('emits an error result for the lambda when the handler fails', async () => {
    await resultRecorder().onError!(
      buildMiddyRequest<APIGatewayProxyEvent, APIGatewayProxyResult>(
        {},
        { error: new Error('crumbs'), functionName: 'test-fn' }
      )
    )

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledExactlyOnceWith(
      LAMBDA_RESULT_METRIC_NAME,
      {
        [LambdaMetricDimensions.LAMBDA]: 'test-fn',
        [LambdaMetricDimensions.RESULT]: LambdaResult.ERROR
      },
      1,
      MetricUnit.Count
    )
  })
})
