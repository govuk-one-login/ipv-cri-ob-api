import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { createSessionRepository } from '@common/client/session-repository'
import {
  errorHandler,
  httpHeaderNormalizer,
  injectLambdaContext,
  latencyRecorder,
  logMetrics,
  resultRecorder
} from '@common/handler/middleware'
import { requireEnv } from '@common/util/env'
import { requireSessionId } from '@common/util/headers'
import { logger } from '@govuk-one-login/cri-logger'
import { metrics } from '@govuk-one-login/cri-metrics'
import { createBankListRepository } from '@src/bank-list/client/bank-list-repository'
import { createBankListRetrievalService } from '@src/bank-list/service/bank-list-retrieval-service'

import middy from '@middy/core'

const sessionRepository = createSessionRepository(
  { tableName: requireEnv('SESSION_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)

const bankListRepository = createBankListRepository(
  { tableName: requireEnv('BANK_LIST_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)

const bankListRetrievalService = createBankListRetrievalService({
  sessionRepository,
  bankListRepository
})

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Lambda invoked')
  const sessionId = requireSessionId(event.headers?.['session-id'])

  const { bankList } = await bankListRetrievalService({ sessionId })

  if (!bankList) {
    return { body: '', statusCode: 204 }
  }

  return {
    body: JSON.stringify(bankList),
    headers: { 'Content-Type': 'application/json' },
    statusCode: 200
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
