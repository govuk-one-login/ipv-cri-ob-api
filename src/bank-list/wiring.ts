import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { createSessionRepository } from '@common/client/session-repository'
import { requireEnv } from '@common/util/env'
import { createDynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import { createBankListRepository } from '@src/bank-list/client/bank-list-repository'

export const sessionRepository = createSessionRepository(
  { tableName: requireEnv('SESSION_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)

export const bankListRepository = createBankListRepository(
  { tableName: requireEnv('BANK_LIST_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)

export const dynamoTokenRepository = createDynamoTokenRepository(
  { tableName: requireEnv('TOKEN_ROTATOR_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)
