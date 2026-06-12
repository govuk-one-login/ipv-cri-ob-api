import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type { Request } from '@middy/core'
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'

import { latencyRecorder } from '@common/handler/middleware'
import { LambdaMetricDimensions, LambdaStartState } from '@common/model/metrics/lambda-metrics'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as criMetrics from '@govuk-one-login/cri-metrics'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

const buildRequest = (): Request<APIGatewayProxyEvent, APIGatewayProxyResult> => ({
  context: { functionName: 'fn-name' } as Context,
  error: null,
  event: {} as APIGatewayProxyEvent,
  internal: {},
  response: null
})

const expectStartStateOnCall = (callIndex: number, expected: LambdaStartState): void => {
  expect(criMetrics.captureMetricWithDimensions).toHaveBeenNthCalledWith(
    callIndex,
    expect.anything(),
    expect.objectContaining({ [LambdaMetricDimensions.StartState]: expected }),
    expect.anything(),
    expect.anything()
  )
}

describe('latencyRecorder', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('marks first invoke cold and subsequent hot', async () => {
    const recorder = latencyRecorder()
    const firstRequest = buildRequest()
    const secondRequest = buildRequest()
    const thirdRequest = buildRequest()

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
    const erroringRequest = buildRequest()
    const followUpRequest = buildRequest()

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

    await recorder.after!(buildRequest())

    expect(criMetrics.captureMetricWithDimensions).not.toHaveBeenCalled()
  })
})
