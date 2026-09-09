import type { ScheduledEvent } from 'aws-lambda'

import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { ssmConfigProvider } from '@common/client/ssm-config-provider'
import { injectLambdaContext, logMetrics } from '@common/handler/middleware'
import { requireEnv } from '@common/util/env'
import { logger } from '@govuk-one-login/cri-logger'
import { metrics } from '@govuk-one-login/cri-metrics'
import { createDynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import { createTokenRetrievalService } from '@lib/token-rotator/service/token-retrieval-service'
import { createBankListRepository } from '@src/bank-list/client/bank-list-repository'
import { createEcospendBankListProvider } from '@src/bank-list/client/ecospend-bank-list-provider'
import { createBankListUpdateCoordinator } from '@src/bank-list/service/bank-list-update-coordinator'
import { createBankListUpdateService } from '@src/bank-list/service/bank-list-update-service'
import { parseProfiles } from '@src/bank-list/util/load-config-from-env'

import middy from '@middy/core'

const REFRESH_AFTER_SECONDS = 55 * 60

const enabledProfiles = parseProfiles(requireEnv('BANK_LIST_PROFILES'))
const banksRequestConfigPathPrefix = `/${requireEnv('PARAMETER_PREFIX')}/bank-list`

const bankListRepository = createBankListRepository(
  { tableName: requireEnv('BANK_LIST_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)

const dynamoTokenRepository = createDynamoTokenRepository(
  { tableName: requireEnv('TOKEN_ROTATOR_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)

const tokenRetrievalService = createTokenRetrievalService({
  tokenRepository: dynamoTokenRepository
})

const ecospendBankListProvider = createEcospendBankListProvider({
  tokenRetrievalService
})

const bankListUpdateService = createBankListUpdateService(
  { banksRequestConfigPathPrefix, refreshAfterSeconds: REFRESH_AFTER_SECONDS },
  {
    bankListProvider: ecospendBankListProvider,
    bankListRepository,
    ssmConfigProvider
  }
)

const bankListUpdateCoordinator = createBankListUpdateCoordinator(
  { profiles: enabledProfiles },
  { bankListUpdateService }
)

const lambdaHandler = async (_event: ScheduledEvent): Promise<void> => {
  logger.info('Bank list updater invoked', { profiles: enabledProfiles })

  await bankListUpdateCoordinator.updateAll()
}

export const handler = middy<ScheduledEvent, void>()
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .handler(lambdaHandler)
