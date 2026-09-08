import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { requireEnv } from '@common/util/env'
import { createDynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'

export const dynamoTokenRepository = createDynamoTokenRepository(
  { tableName: requireEnv('TOKEN_ROTATOR_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)
