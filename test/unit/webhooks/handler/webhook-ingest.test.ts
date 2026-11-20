import type { WebhookIngestService } from '@src/webhooks/service/webhook-ingest-service'
import type { APIGatewayProxyEvent, Context } from 'aws-lambda'

import { handler } from '@src/webhooks/handler/webhook-ingest'
import { WebhookIngestStatus } from '@src/webhooks/model/webhook-ingest-status'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { webhookIngestService } = vi.hoisted(() => ({
  webhookIngestService: vi.fn<WebhookIngestService>()
}))

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn()
}))

vi.mock('@src/webhooks/client/webhook-queue', () => ({
  createWebhookQueue: () => ({ publish: vi.fn() })
}))

vi.mock('@src/webhooks/client/webhook-deduplication-repository', () => ({
  createWebhookDeduplicationRepository: () => ({
    getWebhookEvent: vi.fn(),
    putWebhookEvent: vi.fn()
  })
}))

vi.mock('@src/webhooks/service/webhook-ingest-service', () => ({
  createWebhookIngestService: () => webhookIngestService
}))

const eventBody = JSON.stringify({ event_id: 'event-123' })

const buildEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    body: eventBody,
    headers: { 'x-signature': 'test-signing-key' },
    ...overrides
  }) as APIGatewayProxyEvent

const buildContext = () => ({ functionName: 'webhook-ingest' }) as Context

describe('webhook ingest handler', () => {
  beforeEach(() => {
    webhookIngestService.mockReset()
    webhookIngestService.mockResolvedValue(WebhookIngestStatus.ACCEPTED)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('passes the body and signature to the service', async () => {
    await handler(buildEvent(), buildContext())

    expect(webhookIngestService).toHaveBeenCalledWith({
      eventBody: JSON.stringify({ event_id: 'event-123' }),
      signature: 'test-signing-key'
    })
  })

  it('returns 200 on success', async () => {
    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(200)
    expect(result.body).toBe('')
  })

  it('returns 200 for duplicate webhook', async () => {
    webhookIngestService.mockResolvedValue(WebhookIngestStatus.ACCEPTED_DUPLICATE)

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(200)
  })

  it('returns 401 when x-signature header is missing', async () => {
    const result = await handler(buildEvent({ headers: {} }), buildContext())

    expect(result.statusCode).toBe(401)
    expect(webhookIngestService).not.toHaveBeenCalled()
  })

  it('returns 500 when the service throws an unexpected error', async () => {
    webhookIngestService.mockRejectedValue(new Error('crumbs'))

    const result = await handler(buildEvent(), buildContext())

    expect(result.statusCode).toBe(500)
  })
})
