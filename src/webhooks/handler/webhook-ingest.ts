import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { SQSClient } from '@aws-sdk/client-sqs'
import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { ssmConfigProvider } from '@common/client/ssm-config-provider'
import { latencyRecorder, resultRecorder } from '@common/handler/middleware/recorders'
import { errorResponder } from '@common/handler/middleware/responders'
import { requireEnv } from '@common/util/env'
import { injectLambdaContext, logger } from '@govuk-one-login/cri-logger'
import { logMetrics, metrics } from '@govuk-one-login/cri-metrics'
import { createWebhookDeduplicationRepository } from '@src/webhooks/client/webhook-deduplication-repository'
import { createWebhookQueue } from '@src/webhooks/client/webhook-queue'
import { WebhookIngestStatus } from '@src/webhooks/model/webhook-ingest-status'
import { createWebhookIngestService } from '@src/webhooks/service/webhook-ingest-service'

import middy from '@middy/core'
import httpHeaderNormalizer from '@middy/http-header-normalizer'

const webhookIngestConfigPathPrefix = `/${requireEnv('PARAMETER_PREFIX')}/webhook-ingest/signing-secrets`

const sqsClient = new SQSClient({})

const webhookQueue = createWebhookQueue({
  client: sqsClient,
  config: { queueUrl: requireEnv('WEBHOOK_QUEUE_URL') }
})

const webhookDeduplicationRepository = createWebhookDeduplicationRepository(
  { tableName: requireEnv('WEBHOOK_DEDUPLICATION_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)

const webhookIngestService = createWebhookIngestService(
  { configPath: webhookIngestConfigPathPrefix },
  { webhookQueue, webhookDeduplicationRepository, externalConfigProvider: ssmConfigProvider }
)

const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  logger.info('Lambda invoked')
  const signature = event.headers['x-signature']?.trim()
  if (!signature) {
    logger.warn('Missing signature')
    return { statusCode: WebhookIngestStatus.SIGNATURE_INVALID, body: '' }
  }

  const status = await webhookIngestService({
    eventBody: event.body,
    signature
  })

  return { statusCode: status, body: '' }
}

export const handler = middy<APIGatewayProxyEvent, APIGatewayProxyResult>()
  .use(latencyRecorder()) // latencyRecorder is first
  .use(resultRecorder())
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(httpHeaderNormalizer())
  .use(errorResponder()) // errorResponder is last
  .handler(lambdaHandler)
