import type { SessionRepository } from '@common/client/session-repository'
import type { SSMConfigProvider } from '@common/client/ssm-config-provider'
import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { TokenRetrievalService } from '@lib/token-rotator/service/token-retrieval-service'
import type { ConsentsRepository } from '@src/consents/client/consents-repository'
import type { ConsentsProvider } from '@src/consents/model/consents-provider'
import type { ConsentsRequest } from '@src/consents/model/consents-request'
import type { ConsentsResponse } from '@src/consents/model/consents-response'

import { BadRequestError } from '@common/error/bad-request-error'
import { requireSessionContext } from '@common/service/session-context'
import { nowSeconds } from '@common/util/time'
import { logger } from '@govuk-one-login/cri-logger'
import { type ConsentsConfig, consentsConfigSchema } from '@src/consents/model/consents-config'
import { consentsRequestSchema } from '@src/consents/model/consents-request'
import { toConsentEntity } from '@src/consents/model/database/consent-entity'

export type ConsentsService = (request: {
  eventBody: null | string
  sessionId: string
}) => Promise<ConsentsResponse>

interface ConsentsServiceCollaborators {
  consentsProvider: ConsentsProvider
  consentsRepository: ConsentsRepository
  externalConfigProvider: SSMConfigProvider
  sessionRepository: SessionRepository
  tokenRetrievalService: TokenRetrievalService<EndpointProfile>
}

interface ConsentsServiceConfig {
  consentsConfigPathPrefix: string
}

export const createConsentsService = (
  config: ConsentsServiceConfig,
  collaborators: ConsentsServiceCollaborators
): ConsentsService => {
  return async (request) => {
    const { profile, session } = await requireSessionContext(
      collaborators.sessionRepository,
      request.sessionId
    )

    const parsedRequest = consentsRequestSchema.safeParse(request.eventBody)
    if (!parsedRequest.success) throw new BadRequestError(parsedRequest.error.message)
    const consentsRequest: ConsentsRequest = parsedRequest.data

    const existingConsent = await collaborators.consentsRepository.getConsent(session.sessionId)

    if (
      existingConsent &&
      existingConsent.bankId === consentsRequest.bankId &&
      existingConsent.bankConsentUrlExpirySeconds > nowSeconds()
    ) {
      logger.info('Found active consent for session')
      return {
        cached: true,
        id: existingConsent.consentId,
        url: existingConsent.bankConsentUrl,
        urlExpirySeconds: existingConsent.bankConsentUrlExpirySeconds
      }
    }

    const rawConfig = await collaborators.externalConfigProvider.get(
      `${config.consentsConfigPathPrefix}/${profile}`
    )
    const parsedConfig = consentsConfigSchema.safeParse(rawConfig)
    if (!parsedConfig.success) {
      throw new Error(`Invalid consents config: ${parsedConfig.error.message}`)
    }
    const consentsConfig: ConsentsConfig = parsedConfig.data

    const accessToken = await collaborators.tokenRetrievalService.retrieveToken(profile)
    if (!accessToken) throw new Error(`No token is available`)

    const createdConsent = await collaborators.consentsProvider.createConsent({
      accessToken,
      bankId: consentsRequest.bankId,
      endpointUrl: consentsConfig.endpointUrl,
      profile,
      returnUrl: consentsRequest.returnUrl
    })
    logger.appendKeys({ consent_id: createdConsent.consentId })
    logger.info('Consent created')

    const consentEntity = toConsentEntity(createdConsent, session.sessionId)

    await collaborators.consentsRepository.putConsent(consentEntity)
    logger.info('Consent stored')

    return {
      id: consentEntity.consentId,
      url: consentEntity.bankConsentUrl,
      urlExpirySeconds: consentEntity.bankConsentUrlExpirySeconds
    }
  }
}
