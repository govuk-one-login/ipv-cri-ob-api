import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { SQSClient } from '@aws-sdk/client-sqs'
import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { ssmConfigProvider } from '@common/client/ssm-config-provider'
import {
  errorHandler,
  httpHeaderNormalizer,
  injectLambdaContext,
  latencyRecorder,
  logMetrics,
  resultRecorder
} from '@common/handler/middleware'
import { requireEnv } from '@common/util/env'
import { logger } from '@govuk-one-login/cri-logger'
import { metrics } from '@govuk-one-login/cri-metrics'
import { createWebhookDeduplicationRepository } from '@src/webhooks/client/webhook-deduplication-repository'
import { createWebhookQueue } from '@src/webhooks/client/webhook-queue'
import { WebhookIngestOutcome } from '@src/webhooks/model/webhook-ingest-outcome'
import { createWebhookIngestService } from '@src/webhooks/service/webhook-ingest-service'

import middy from '@middy/core'

const webhooksConfigPath = `/${requireEnv('PARAMETER_PREFIX')}/webhook-ingest/signing-secrets`

const webhookDuplicationRepository = createWebhookDeduplicationRepository(
  { tableName: requireEnv('WEBHOOK_DEDUPLICATION_TABLE_NAME') },
  dynamoDBDocumentClient
)

const webhookQueue = createWebhookQueue(
  { queueUrl: requireEnv('WEBHOOK_QUEUE_URL') },
  new SQSClient({})
)

const webhookIngestService = createWebhookIngestService(
  { configPath: webhooksConfigPath },
  {
    externalConfigProvider: ssmConfigProvider,
    webhookDuplicationRepository,
    webhookQueue
  }
)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Lambda invoked')
  const signature = event.headers?.['x-signature']?.trim()
  if (!signature) {
    logger.warn('Rejected webhook with missing signature')
    return { body: '', statusCode: WebhookIngestOutcome.SIGNATURE_INVALID }
  }
  const outcome = await webhookIngestService({ signature, eventBody: event.body })
  return { body: '', statusCode: outcome }
}

export const handler = middy<APIGatewayProxyEvent, APIGatewayProxyResult>()
  .use(latencyRecorder()) // latencyRecorder is first
  .use(resultRecorder())
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(httpHeaderNormalizer())
  .use(errorHandler()) // errorHandler is last
  .handler(lambdaHandler)
