import type { SessionRepository } from '@common/client/session-repository'
import type { AuditEventPublisher } from '@common/service/audit-event-publisher'
import type { EcospendConsentClient } from '@src/consent/client/ecospend-consent.client'
import type { ConsentResponse } from '@src/consent/model'

import { BadRequestError } from '@common/error/bad-request-error'
import { getTokenProfileForClientId } from '@common/util/oauth-client-id'
import { consentRequestSchema } from '@src/consent/model/consent-request'
import { SessionNotFoundError } from '@src/issue-credential/error'
import { z } from 'zod'

type ConsentService = (request: {
  eventBody: unknown
  sessionId: string
}) => Promise<ConsentResponse>

interface ConsentServiceCollaborators {
  auditEventPublisher: AuditEventPublisher
  ecospendConsentClient: EcospendConsentClient
  sessionRepository: SessionRepository
}

export const createConsentService = (
  collaborators: ConsentServiceCollaborators
): ConsentService => {
  return async (request) => {
    const session = await collaborators.sessionRepository.findBySessionId(request.sessionId)
    if (!session) throw new SessionNotFoundError()

    const consentRequest = consentRequestSchema.safeParse(request.eventBody)
    if (!consentRequest.success) throw new BadRequestError(z.prettifyError(consentRequest.error))

    const ecospendCreateConsentResponse = await collaborators.ecospendConsentClient.createConsent(
      getTokenProfileForClientId(session.clientId),
      {
        bank_id: consentRequest.data.bankId,
        redirect_url: consentRequest.data.returnUrl,
        permissions: ['Account']
      }
    )

    return {
      url: ecospendCreateConsentResponse.bank_consent_url,
      id: ecospendCreateConsentResponse.id
    }
  }
}
