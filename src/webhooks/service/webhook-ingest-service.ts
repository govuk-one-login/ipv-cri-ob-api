import type { SSMConfigProvider } from '@common/client/ssm-config-provider'
import type { WebhookDeduplicationRepository } from '@src/webhooks/client/webhook-deduplication-repository'
import type { WebhookQueue } from '@src/webhooks/client/webhook-queue'

import { describeZodIssues } from '@common/util/zod'
import { logger } from '@govuk-one-login/cri-logger'
import { toWebhookDeduplicationEntity } from '@src/webhooks/model/database/webhook-deduplication-entity'
import { webhookIngestConfigSchema } from '@src/webhooks/model/webhook-ingest-config'
import { webhookIngestRequestSchema } from '@src/webhooks/model/webhook-ingest-request'
import { WebhookIngestStatus } from '@src/webhooks/model/webhook-ingest-status'
import { verifySignature } from '@src/webhooks/service/webhook-signature-verification-service'

export type WebhookIngestService = (request: {
  eventBody: null | string
  signature: string
}) => Promise<WebhookIngestStatus>

interface WebhookIngestServiceCollaborators {
  externalConfigProvider: SSMConfigProvider
  webhookDeduplicationRepository: WebhookDeduplicationRepository
  webhookQueue: WebhookQueue
}

interface WebhookIngestServiceConfig {
  configPath: string
}

export const createWebhookIngestService = (
  config: WebhookIngestServiceConfig,
  collaborators: WebhookIngestServiceCollaborators
): WebhookIngestService => {
  return async ({ eventBody, signature }) => {
    if (!eventBody) {
      logger.warn('Missing request body')
      return WebhookIngestStatus.PAYLOAD_INVALID
    }

    const rawConfig = await collaborators.externalConfigProvider.get(config.configPath)
    const parsedConfig = webhookIngestConfigSchema.safeParse(rawConfig)
    if (!parsedConfig.success) {
      throw new Error(`Invalid webhooks config: ${describeZodIssues(parsedConfig.error)}`)
    }
    const webhookIngestConfig = parsedConfig.data

    const isValidSignature = webhookIngestConfig.signingSecrets.some((signingSecret) =>
      verifySignature({
        webhookSigningKey: signingSecret,
        eventBody: eventBody,
        providedSignature: signature
      })
    )

    if (!isValidSignature) {
      logger.warn('Invalid signature')
      return WebhookIngestStatus.SIGNATURE_INVALID
    }

    const parsedRequest = webhookIngestRequestSchema.safeParse(eventBody)
    if (!parsedRequest.success) {
      logger.warn('Invalid payload', {
        issues: describeZodIssues(parsedRequest.error)
      })
      return WebhookIngestStatus.PAYLOAD_INVALID
    }

    const { eventId } = parsedRequest.data
    logger.appendKeys({ event_id: eventId })

    try {
      const existingEvent =
        await collaborators.webhookDeduplicationRepository.getWebhookEvent(eventId)
      if (existingEvent) {
        logger.info('Duplicate webhook')
        return WebhookIngestStatus.ACCEPTED_DUPLICATE
      }
    } catch (error) {
      logger.error('Failed to read from DynamoDB deduplication table, failing open', {
        error
      })
    }

    await collaborators.webhookQueue.publish(eventBody)
    await collaborators.webhookDeduplicationRepository.putWebhookEvent(
      toWebhookDeduplicationEntity(eventId)
    )

    logger.info('Webhook accepted')
    return WebhookIngestStatus.ACCEPTED
  }
}
