import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { sessionRepository } from '@common/client/session-repository'
import {
  errorHandler,
  httpHeaderNormalizer,
  injectLambdaContext,
  latencyRecorder,
  logMetrics,
  resultRecorder
} from '@common/handler/middleware'
import { auditEventPublisher } from '@common/service/audit-event-publisher'
import { parseSessionId } from '@common/util/session-id'
import { logger } from '@govuk-one-login/cri-logger'
import { metrics } from '@govuk-one-login/cri-metrics'
import { ecospendConsentClient } from '@src/consent/client/ecospend-consent.client'
import { createConsentService } from '@src/consent/service/consent-service'

import middy from '@middy/core'

const consentService = createConsentService({
  auditEventPublisher,
  sessionRepository,
  ecospendConsentClient
})

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Lambda invoked')
  const sessionId = parseSessionId(event.headers?.['session_id'])
  const consent = await consentService({ sessionId, eventBody: event.body })
  return {
    body: JSON.stringify(consent),
    headers: { 'Content-Type': 'application/json' },
    statusCode: 201
  }
}

export const handler = middy<APIGatewayProxyEvent, APIGatewayProxyResult>()
  .use(latencyRecorder()) // latencyRecorder is first
  .use(resultRecorder())
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(httpHeaderNormalizer())
  .use(errorHandler()) // errorHandler is last
  .handler(lambdaHandler)
