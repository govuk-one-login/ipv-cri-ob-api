import type { TokenEntity } from '@lib/token-rotator/model/token-entity'
import type { TokenRepository } from '@lib/token-rotator/model/token-repository'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { requireEnv } from '@lib/token-rotator/util/env'

interface DynamoTokenRepositoryConfig {
  tableName: string
}

export const createDynamoTokenRepository = (
  config: DynamoTokenRepositoryConfig,
  client: DynamoDBDocumentClient
): TokenRepository => ({
  getToken: async (profile) => {
    const { Item } = await client.send(
      new GetCommand({ Key: { id: profile }, TableName: config.tableName })
    )
    return Item as TokenEntity | undefined
  },
  putToken: async (entity) => {
    await client.send(new PutCommand({ Item: entity, TableName: config.tableName }))
  }
})

export const dynamoTokenRepository = createDynamoTokenRepository(
  { tableName: requireEnv('TOKEN_ROTATOR_DB_TABLE_NAME') },
  DynamoDBDocumentClient.from(new DynamoDBClient({}))
)
