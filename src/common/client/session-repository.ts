import type { AccessTokenSessionItem } from '@common/model/session'
import type { SessionItem } from '@govuk-one-login/cri-types'

import { type DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { AmbiguousAccessTokenError } from '@common/error/ambiguous-access-token-error'

export interface SessionRepository {
  findByAccessToken: (accessToken: string) => Promise<AccessTokenSessionItem | undefined>
  findBySessionId: (sessionId: string) => Promise<SessionItem | undefined>
}

export interface SessionRepositoryConfig {
  tableName: string
}

// see oauth common SessionTable
const ACCESS_TOKEN_INDEX = 'access-token-index-with-event-data'

export const createSessionRepository = (
  config: SessionRepositoryConfig,
  client: DynamoDBDocumentClient
): SessionRepository => ({
  findByAccessToken: async (accessToken) => {
    const { Items } = await client.send(
      new QueryCommand({
        ExpressionAttributeValues: { ':accessToken': accessToken },
        IndexName: ACCESS_TOKEN_INDEX,
        KeyConditionExpression: 'accessToken = :accessToken',
        TableName: config.tableName
      })
    )
    if (Items && Items.length > 1) throw new AmbiguousAccessTokenError()
    return Items?.[0] as AccessTokenSessionItem | undefined
  },

  findBySessionId: async (sessionId) => {
    const { Item } = await client.send(
      new GetCommand({
        ConsistentRead: true,
        Key: { sessionId },
        TableName: config.tableName
      })
    )
    return Item as SessionItem | undefined
  }
})
