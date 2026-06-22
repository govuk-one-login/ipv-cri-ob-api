import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { TokenEntity } from '@src/third-party-token/model/token-entity'

import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { requireEnv } from '@common/util/env'

export interface TokenRepository {
  clearToken: (id: string) => Promise<void>
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
  clearToken: async (id) => {
    await client.send(new DeleteCommand({ Key: { id }, TableName: config.tableName }))
  },
  getToken: async (id) => {
    const { Item } = await client.send(new GetCommand({ Key: { id }, TableName: config.tableName }))
    return Item as TokenEntity | undefined
  },
  putToken: async (entity) => {
    await client.send(new PutCommand({ Item: entity, TableName: config.tableName }))
  }
})

export const tokenRepository = createTokenRepository(
  { tableName: requireEnv('THIRD_PARTY_TOKEN_DYNAMO_TABLE_NAME') },
  dynamoDBDocumentClient
)
