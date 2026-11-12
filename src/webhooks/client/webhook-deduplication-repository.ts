import type { WebhookDeduplicationEntity } from '@src/webhooks/model/database/webhook-deduplication-entity'

import { type DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

export interface WebhookDeduplicationRepository {
  getWebhookEvent: (eventId: string) => Promise<undefined | WebhookDeduplicationEntity>
  putWebhookEvent: (entity: WebhookDeduplicationEntity) => Promise<void>
}

export interface WebhookDeduplicationRepositoryConfig {
  tableName: string
}

export const createWebhookDeduplicationRepository = (
  config: WebhookDeduplicationRepositoryConfig,
  client: DynamoDBDocumentClient
): WebhookDeduplicationRepository => ({
  getWebhookEvent: async (eventId) => {
    const { Item } = await client.send(
      new GetCommand({
        Key: {
          eventId
        },
        TableName: config.tableName
      })
    )
    return Item as undefined | WebhookDeduplicationEntity
  },
  putWebhookEvent: async (entity) => {
    await client.send(
      new PutCommand({
        Item: entity,
        TableName: config.tableName
      })
    )
  }
})
