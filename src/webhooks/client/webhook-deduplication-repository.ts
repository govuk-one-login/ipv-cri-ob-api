import type { WebhookDeduplicationEntity } from '@src/webhooks/model/database/webhook-deduplication-entity'

import { type DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

export interface WebhookDeduplicationRepository {
  getWebhook: (eventId: string) => Promise<undefined | WebhookDeduplicationEntity>
  putWebhook: (entity: WebhookDeduplicationEntity) => Promise<void>
}

export interface WebhookDeduplicationRepositoryConfiguration {
  tableName: string
}

export const createWebhookDeduplicationRepository = (
  config: WebhookDeduplicationRepositoryConfiguration,
  client: DynamoDBDocumentClient
): WebhookDeduplicationRepository => ({
  getWebhook: async (eventId) => {
    const { Item } = await client.send(
      new GetCommand({
        ConsistentRead: true,
        Key: { eventId },
        TableName: config.tableName
      })
    )
    return Item as undefined | WebhookDeduplicationEntity
  },
  putWebhook: async (entity) => {
    await client.send(
      new PutCommand({
        Item: entity,
        TableName: config.tableName
      })
    )
  }
})
