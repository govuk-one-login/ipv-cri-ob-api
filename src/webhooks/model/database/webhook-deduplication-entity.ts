import { nowSeconds } from '@common/util/time'

const DEDUPLICATION_TTL_SECONDS = 60 * 60 // 1 hour

export interface WebhookDeduplicationEntity {
  eventId: string
  ttl: number
}

export const toWebhookDeduplicationEntity = (eventId: string): WebhookDeduplicationEntity => {
  return {
    eventId,
    ttl: nowSeconds() + DEDUPLICATION_TTL_SECONDS
  }
}
