import { nowSeconds } from '@common/util/time'

const WEBHOOK_DEDUPLICATION_TTL_SECONDS = 60 * 60

export interface WebhookDeduplicationEntity {
  eventId: string
  ttl: number
}

export const toWebhookDeduplicationEntity = (eventId: string): WebhookDeduplicationEntity => ({
  eventId,
  ttl: nowSeconds() + WEBHOOK_DEDUPLICATION_TTL_SECONDS
})
