import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { CredentialsProvider } from '@lib/token-rotator/model/credentials-provider'
import type { ScheduledEvent } from 'aws-lambda'

import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { ssmConfigProvider } from '@common/client/ssm-config-provider'
import { injectLambdaContext } from '@common/handler/middleware'
import { requireEnv } from '@common/util/env'
import { logger } from '@govuk-one-login/cri-logger'
import { logMetrics, metrics } from '@govuk-one-login/cri-metrics'
import { createDynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import { createTokenRotator } from '@lib/token-rotator/handler/token-rotator'
import { ecospendTokenStrategy } from '@src/ecospend-token/service/ecospend-token-strategy'
import { loadTokenRotatorConfigFromEnv } from '@src/ecospend-token/util/load-config-from-env'

import middy from '@middy/core'

const tokenCredentialsPathPrefix = requireEnv('TOKEN_ROTATOR_CREDENTIALS_PATH')

const ssmCredentialsProvider: CredentialsProvider<EndpointProfile> = {
  getCredentials: (profile) => ssmConfigProvider.get(`${tokenCredentialsPathPrefix}/${profile}`)
}

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
