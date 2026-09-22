import type { SessionRepository } from '@common/client/session-repository'
import type { SSMConfigProvider } from '@common/client/ssm-config-provider'
import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { TokenRetrievalService } from '@lib/token-rotator/service/token-retrieval-service'
import type { ConsentsRepository } from '@src/consents/client/consents-repository'
import type { ConsentsProvider } from '@src/consents/model/consents-provider'
import type { ConsentsResponse } from '@src/consents/model/consents-response'

import { BadRequestError } from '@common/error/bad-request-error'
import { requireSessionContext } from '@common/service/session-context'
import { nowSeconds } from '@common/util/time'
import { logger } from '@govuk-one-login/cri-logger'
import { consentsConfigSchema } from '@src/consents/model/consents-config'
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

    const consentsRequest = consentsRequestSchema.safeParse(request.eventBody)
    if (!consentsRequest.success) throw new BadRequestError(consentsRequest.error.message)

    const existingConsent = await collaborators.consentsRepository.getConsent(session.sessionId)

    if (
      existingConsent &&
      existingConsent.bankId === consentsRequest.data.bankId &&
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

    const rawRequestConfig = await collaborators.externalConfigProvider.get(
      `${config.consentsConfigPathPrefix}/${profile}`
    )
    const requestConfig = consentsConfigSchema.safeParse(rawRequestConfig)
    if (!requestConfig.success) {
      throw new Error(`Invalid consents request config: ${requestConfig.error.message}`)
    }

    const accessToken = await collaborators.tokenRetrievalService.retrieveToken(profile)
    if (!accessToken) throw new Error(`No token is available`)

    const createdConsent = await collaborators.consentsProvider.createConsent({
      accessToken,
      bankId: consentsRequest.data.bankId,
      endpointUrl: requestConfig.data.endpointUrl,
      profile,
      returnUrl: consentsRequest.data.returnUrl
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
