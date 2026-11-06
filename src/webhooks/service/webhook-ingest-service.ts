import type { SSMConfigProvider } from '@common/client/ssm-config-provider'
import type { WebhookDeduplicationRepository } from '@src/webhooks/client/webhook-deduplication-repository'
import type { WebhookQueue } from '@src/webhooks/client/webhook-queue'

import { describeZodIssues } from '@common/util/zod'
import { logger } from '@govuk-one-login/cri-logger'
import { toWebhookDeduplicationEntity } from '@src/webhooks/model/database/webhook-deduplication-entity'
import {
  type WebhookIngestConfig,
  webhookIngestConfigSchema
} from '@src/webhooks/model/webhook-ingest-config'
import { WebhookIngestOutcome } from '@src/webhooks/model/webhook-ingest-outcome'
import { webhookIngestRequestSchema } from '@src/webhooks/model/webhook-ingest-request'
import { verifyWebhookSignature } from '@src/webhooks/service/webhook-signature-verification-service'

export type WebhookIngestService = (request: {
  eventBody: null | string
  signature: string
}) => Promise<WebhookIngestOutcome>

interface WebhookIngestServiceCollaborators {
  externalConfigProvider: SSMConfigProvider
  webhookDuplicationRepository: WebhookDeduplicationRepository
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
      logger.warn('Rejected webhook with empty body')
      return WebhookIngestOutcome.PAYLOAD_INVALID
    }

    const rawConfig = await collaborators.externalConfigProvider.get(config.configPath)
    const parsedConfig = webhookIngestConfigSchema.safeParse(rawConfig)
    if (!parsedConfig.success) {
      throw new Error(`Invalid webhooks config: ${describeZodIssues(parsedConfig.error)}`)
    }
    const webhookIngestConfig: WebhookIngestConfig = parsedConfig.data

    const isVerified = webhookIngestConfig.signingSecrets.some((signingSecret) =>
      verifyWebhookSignature({ body: eventBody, signature, signingSecret })
    )
    if (!isVerified) {
      logger.warn('Rejected webhook with invalid signature')
      return WebhookIngestOutcome.SIGNATURE_INVALID
    }

    const parsedRequest = webhookIngestRequestSchema.safeParse(eventBody)
    if (!parsedRequest.success) {
      logger.warn('Rejected webhook with invalid payload', {
        issues: describeZodIssues(parsedRequest.error)
      })
      return WebhookIngestOutcome.PAYLOAD_INVALID
    }
    const { eventId } = parsedRequest.data

    const existingWebhook = await collaborators.webhookDuplicationRepository.getWebhook(eventId)
    if (existingWebhook) {
      logger.info('Skipping duplicate webhook', { eventId })
      return WebhookIngestOutcome.ACCEPTED_DUPLICATE
    }

    await collaborators.webhookQueue.sendWebhook(eventBody)
    await collaborators.webhookDuplicationRepository.putWebhook(
      toWebhookDeduplicationEntity(eventId)
    )

    logger.info(`Accepted ${eventId}`)
    return WebhookIngestOutcome.ACCEPTED
  }
}
