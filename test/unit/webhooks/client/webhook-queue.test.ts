import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs'
import { createWebhookQueue } from '@src/webhooks/client/webhook-queue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn(),
  SendMessageCommand: vi.fn()
}))

const mockedSendMessageCommand = vi.mocked(SendMessageCommand)

const QUEUE_URL = 'test-queue-url'
const EVENT = '{"event_id": "event-123"}'

const mockClient = { send: vi.fn() }

beforeEach(() => {
  mockClient.send.mockReset()
  mockedSendMessageCommand.mockClear()
})

describe('webhook-queue', () => {
  describe('publish', () => {
    it('sends message to queue URL with body', async () => {
      const publisher = createWebhookQueue({
        client: mockClient as unknown as SQSClient,
        config: { queueUrl: QUEUE_URL }
      })

      await publisher.publish(EVENT)

      expect(mockedSendMessageCommand).toHaveBeenCalledWith({
        QueueUrl: QUEUE_URL,
        MessageBody: EVENT
      })
    })

    it('propagates SQS client errors', async () => {
      mockClient.send.mockRejectedValue(new Error('SQS unavailable'))
      const publisher = createWebhookQueue({
        client: mockClient as unknown as SQSClient,
        config: { queueUrl: QUEUE_URL }
      })

      await expect(publisher.publish(EVENT)).rejects.toThrow('SQS unavailable')
    })
  })
})
