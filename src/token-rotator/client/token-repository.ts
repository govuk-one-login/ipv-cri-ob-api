import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { TokenEntity } from '@src/token-rotator/model/token-entity'

import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { requireEnv } from '@src/token-rotator/util/env'

export interface TokenRepository {
  getToken: (id: string) => Promise<TokenEntity | undefined>
  putToken: (entity: TokenEntity) => Promise<void>
}

export interface TokenRepositoryConfig {
  tableName: string
}

export const createTokenRepository = (
  config: TokenRepositoryConfig,
  client: DynamoDBDocumentClient
): TokenRepository => ({
  getToken: async (id) => {
    const { Item } = await client.send(new GetCommand({ Key: { id }, TableName: config.tableName }))
    return Item as TokenEntity | undefined
  },
  putToken: async (entity) => {
    await client.send(new PutCommand({ Item: entity, TableName: config.tableName }))
  }
})

export const tokenRepository = createTokenRepository(
  { tableName: requireEnv('TOKEN_ROTATOR_DYNAMO_TABLE_NAME') },
  dynamoDBDocumentClient
)
