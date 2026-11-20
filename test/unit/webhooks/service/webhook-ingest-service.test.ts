import type { SSMConfigProvider } from '@common/client/ssm-config-provider'
import type { WebhookDeduplicationRepository } from '@src/webhooks/client/webhook-deduplication-repository'
import type { WebhookQueue } from '@src/webhooks/client/webhook-queue'
import type { WebhookDeduplicationEntity } from '@src/webhooks/model/database/webhook-deduplication-entity'

import { WebhookIngestStatus } from '@src/webhooks/model/webhook-ingest-status'
import { createWebhookIngestService } from '@src/webhooks/service/webhook-ingest-service'
import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW_SECONDS = 690_811_200
const WEBHOOK_CONFIG_PATH_PREFIX = '/test/webhook-ingest'
const SIGNING_KEY = 'test-signing-secret'
const eventBody = JSON.stringify({ event_id: '550e8400-e29b-41d4-a716-446655440000' })
const signature = createHmac('sha256', SIGNING_KEY).update(eventBody).digest('hex')
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440000'

const buildDeduplicationEntity = (
  overrides: Partial<WebhookDeduplicationEntity> = {}
): WebhookDeduplicationEntity => ({
  eventId: EVENT_ID,
  ttl: NOW_SECONDS + 3600,
  ...overrides
})

const buildTestContext = () => {
  const getConfig = vi.fn<SSMConfigProvider['get']>().mockResolvedValue({ ecospend: SIGNING_KEY })
  const getWebhookEvent = vi
    .fn<WebhookDeduplicationRepository['getWebhookEvent']>()
    .mockResolvedValue(undefined)
  const putWebhookEvent = vi
    .fn<WebhookDeduplicationRepository['putWebhookEvent']>()
    .mockResolvedValue(undefined)
  const publish = vi.fn<WebhookQueue['publish']>().mockResolvedValue(undefined)

  const webhookIngestService = createWebhookIngestService(
    { configPath: WEBHOOK_CONFIG_PATH_PREFIX },
    {
      webhookQueue: { publish },
      webhookDeduplicationRepository: { getWebhookEvent, putWebhookEvent },
      externalConfigProvider: { get: getConfig }
    }
  )
  return { webhookIngestService, getConfig, getWebhookEvent, putWebhookEvent, publish }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW_SECONDS * 1000)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createWebhookIngestService', () => {
  it('publishes the webhook to the queue and records it in the dedupe table', async () => {
    const { webhookIngestService, publish, putWebhookEvent } = buildTestContext()

    const result = await webhookIngestService({ eventBody, signature })

    expect(result).toBe(WebhookIngestStatus.ACCEPTED)
    expect(publish).toHaveBeenCalledWith(eventBody)
    expect(putWebhookEvent).toHaveBeenCalledWith(buildDeduplicationEntity())
  })

  it('publishes before recording in the dedupe table', async () => {
    const { webhookIngestService, publish, putWebhookEvent } = buildTestContext()
    const order: string[] = []
    publish.mockImplementation(async () => {
      order.push('publish')
    })
    putWebhookEvent.mockImplementation(async () => {
      order.push('put')
    })

    await webhookIngestService({ eventBody, signature })

    expect(order).toEqual(['publish', 'put'])
  })

  it('returns PAYLOAD_INVALID for a missing event body', async () => {
    const { webhookIngestService, publish } = buildTestContext()

    const result = await webhookIngestService({ eventBody: null, signature })

    expect(result).toBe(WebhookIngestStatus.PAYLOAD_INVALID)
    expect(publish).not.toHaveBeenCalled()
  })

  it('throws for invalid webhook config', async () => {
    const { webhookIngestService, getConfig } = buildTestContext()
    getConfig.mockResolvedValueOnce({ ecospend: '' })

    await expect(webhookIngestService({ eventBody, signature })).rejects.toThrow(
      'Invalid webhooks config'
    )
  })

  it('returns SIGNATURE_INVALID for an invalid signature', async () => {
    const { webhookIngestService, publish } = buildTestContext()

    const result = await webhookIngestService({ eventBody, signature: 'invalid-signature' })

    expect(result).toBe(WebhookIngestStatus.SIGNATURE_INVALID)
    expect(publish).not.toHaveBeenCalled()
  })

  it('returns PAYLOAD_INVALID for an event body that is not valid JSON', async () => {
    const { webhookIngestService, publish } = buildTestContext()
    const invalidBody = '{not json'
    const signature = createHmac('sha256', SIGNING_KEY).update(invalidBody).digest('hex')

    const result = await webhookIngestService({ eventBody: invalidBody, signature: signature })

    expect(result).toBe(WebhookIngestStatus.PAYLOAD_INVALID)
    expect(publish).not.toHaveBeenCalled()
  })

  it('returns PAYLOAD_INVALID for an event body missing a valid event_id', async () => {
    const { webhookIngestService, publish } = buildTestContext()
    const invalidBody = JSON.stringify({ event_id: 'not-a-guid' })
    const signature = createHmac('sha256', SIGNING_KEY).update(invalidBody).digest('hex')

    const result = await webhookIngestService({ eventBody: invalidBody, signature: signature })

    expect(result).toBe(WebhookIngestStatus.PAYLOAD_INVALID)
    expect(publish).not.toHaveBeenCalled()
  })

  describe('duplicate event', () => {
    it('does not publish when the event already exists in the dedupe table', async () => {
      const { webhookIngestService, getWebhookEvent, publish } = buildTestContext()
      getWebhookEvent.mockResolvedValueOnce(buildDeduplicationEntity())

      const result = await webhookIngestService({ eventBody, signature })

      expect(result).toBe(WebhookIngestStatus.ACCEPTED_DUPLICATE)
      expect(publish).not.toHaveBeenCalled()
    })

    it('does not put to the dedupe table when the event is a duplicate', async () => {
      const { webhookIngestService, getWebhookEvent, putWebhookEvent } = buildTestContext()
      getWebhookEvent.mockResolvedValueOnce(buildDeduplicationEntity())

      await webhookIngestService({ eventBody, signature })

      expect(putWebhookEvent).not.toHaveBeenCalled()
    })
  })

  describe('dedupe table read failure', () => {
    it('still publishes when the dedupe table read fails (fail open)', async () => {
      const { webhookIngestService, getWebhookEvent, publish } = buildTestContext()
      getWebhookEvent.mockRejectedValueOnce(new Error('DynamoDB unavailable'))

      const result = await webhookIngestService({ eventBody, signature })

      expect(result).toBe(WebhookIngestStatus.ACCEPTED)
      expect(publish).toHaveBeenCalledWith(eventBody)
    })

    it('still puts to the dedupe table when the read fails', async () => {
      const { webhookIngestService, getWebhookEvent, putWebhookEvent } = buildTestContext()
      getWebhookEvent.mockRejectedValueOnce(new Error('DynamoDB unavailable'))

      await webhookIngestService({ eventBody, signature })

      expect(putWebhookEvent).toHaveBeenCalledWith(buildDeduplicationEntity())
    })
  })
})
