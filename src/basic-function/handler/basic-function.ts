import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import {
  errorHandler,
  httpHeaderNormalizer,
  injectLambdaContext,
  latencyRecorder,
  logMetrics,
  resultRecorder
} from '@common/handler/middleware'
import { logger } from '@govuk-one-login/cri-logger'
import { metrics } from '@govuk-one-login/cri-metrics'

import middy from '@middy/core'

const lambdaHandler = (event: APIGatewayProxyEvent): APIGatewayProxyResult => {
  logger.info('Lambda invoked')

  return {
    body: JSON.stringify({
      message: 'Hello from the basic function',
      path: event.path
    }),
    statusCode: 200
  }
}

export const handler = middy<APIGatewayProxyEvent, APIGatewayProxyResult>()
  .use(latencyRecorder())
  .use(resultRecorder())
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(httpHeaderNormalizer())
  .use(errorHandler())
  .handler(lambdaHandler)
