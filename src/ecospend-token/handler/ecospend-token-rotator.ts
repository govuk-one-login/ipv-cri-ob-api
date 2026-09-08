import type { ScheduledEvent } from 'aws-lambda'

import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { injectLambdaContext } from '@common/handler/middleware'
import { requireEnv } from '@common/util/env'
import { logger } from '@govuk-one-login/cri-logger'
import { logMetrics, metrics } from '@govuk-one-login/cri-metrics'
import { createDynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import { ssmCredentialsProvider } from '@lib/token-rotator/client/ssm-credentials-provider'
import { createTokenRotator } from '@lib/token-rotator/handler/token-rotator'
import { loadTokenRotatorConfigFromEnv } from '@lib/token-rotator/util/load-config-from-env'
import { ecospendTokenStrategy } from '@src/ecospend-token/service/ecospend-token-strategy'

import middy from '@middy/core'

const dynamoTokenRepository = createDynamoTokenRepository(
  { tableName: requireEnv('TOKEN_ROTATOR_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)

const tokenRotator = createTokenRotator(loadTokenRotatorConfigFromEnv(), {
  credentialsProvider: ssmCredentialsProvider,
  tokenRepository: dynamoTokenRepository,
  tokenRotationStrategy: ecospendTokenStrategy
})

export const handler = middy<ScheduledEvent, void>()
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .handler(tokenRotator)
