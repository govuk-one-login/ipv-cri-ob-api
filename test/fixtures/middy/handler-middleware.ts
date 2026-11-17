import type * as RecordersModule from '@common/handler/middleware/recorders'
import type * as RespondersModule from '@common/handler/middleware/responders'
import type * as CriLoggerModule from '@govuk-one-login/cri-logger'
import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type * as HttpHeaderNormalizerModule from '@middy/http-header-normalizer'

import { vi } from 'vitest'

type MiddlewareFactory = (...args: never[]) => unknown

export const middlewareOrder: string[] = []

const recordingOrder =
  <TMiddleware extends MiddlewareFactory>(name: string, middleware: TMiddleware) =>
  (...args: Parameters<TMiddleware>): ReturnType<TMiddleware> => {
    middlewareOrder.push(name)
    return middleware(...args) as ReturnType<TMiddleware>
  }

vi.mock('@common/handler/middleware/recorders', async (importOriginal) => {
  const original = await importOriginal<typeof RecordersModule>()
  return {
    ...original,
    latencyRecorder: recordingOrder('latencyRecorder', original.latencyRecorder),
    resultRecorder: recordingOrder('resultRecorder', original.resultRecorder)
  }
})

vi.mock('@common/handler/middleware/responders', async (importOriginal) => {
  const original = await importOriginal<typeof RespondersModule>()
  return {
    ...original,
    cfnCustomResourceEventResponder: recordingOrder(
      'cfnCustomResourceEventResponder',
      original.cfnCustomResourceEventResponder
    ),
    errorResponder: recordingOrder('errorResponder', original.errorResponder)
  }
})

vi.mock('@govuk-one-login/cri-logger', async (importOriginal) => {
  const original = await importOriginal<typeof CriLoggerModule>()
  return {
    ...original,
    injectLambdaContext: recordingOrder('injectLambdaContext', original.injectLambdaContext)
  }
})

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => {
  const original = await importOriginal<typeof CriMetricsModule>()
  return {
    ...original,
    logMetrics: recordingOrder('logMetrics', original.logMetrics)
  }
})

vi.mock('@middy/http-header-normalizer', async (importOriginal) => {
  const { default: httpHeaderNormalizer } =
    await importOriginal<typeof HttpHeaderNormalizerModule>()
  return { default: recordingOrder('httpHeaderNormalizer', httpHeaderNormalizer) }
})
