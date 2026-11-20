import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { WebhookDeduplicationEntity } from '@src/webhooks/model/database/webhook-deduplication-entity'

import { createWebhookDeduplicationRepository } from '@src/webhooks/client/webhook-deduplication-repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TABLE_NAME = 'deduplication-table'

const buildDeduplicationEntity = (
  overrides: Partial<WebhookDeduplicationEntity> = {}
): WebhookDeduplicationEntity => ({
  eventId: 'event-123',
  ttl: 1_800_000_000,
  ...overrides
})

const mockSendCommand = vi.fn()
const client = { send: mockSendCommand } as unknown as DynamoDBDocumentClient
const repository = createWebhookDeduplicationRepository({ tableName: TABLE_NAME }, client)

beforeEach(() => {
  vi.clearAllMocks()
  mockSendCommand.mockResolvedValue({})
})

describe('webhook-deduplication-repository', () => {
  describe('getWebhookEvent', () => {
    it('reads the event by primary key', async () => {
      await repository.getWebhookEvent('event-123')

      expect(mockSendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Key: { eventId: 'event-123' },
            TableName: TABLE_NAME
          }
        })
      )
    })

    it('returns the entity when found', async () => {
      const entity = buildDeduplicationEntity()
      mockSendCommand.mockResolvedValueOnce({ Item: entity })

      await expect(repository.getWebhookEvent('event-123')).resolves.toEqual(entity)
    })

    it('returns undefined when no event exists', async () => {
      mockSendCommand.mockResolvedValueOnce({})

      await expect(repository.getWebhookEvent('event-123')).resolves.toBeUndefined()
    })

    it('propagates read failures', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('DynamoDB unavailable'))

      await expect(repository.getWebhookEvent('event-123')).rejects.toThrow('DynamoDB unavailable')
    })
  })

  describe('putWebhookEvent', () => {
    it('writes the entity to the table', async () => {
      const entity = buildDeduplicationEntity()

      await repository.putWebhookEvent(entity)

      expect(mockSendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Item: entity,
            TableName: TABLE_NAME
          }
        })
      )
    })

    it('propagates write failures', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('DynamoDB unavailable'))

      await expect(repository.putWebhookEvent(buildDeduplicationEntity())).rejects.toThrow(
        'DynamoDB unavailable'
      )
    })
  })
})
