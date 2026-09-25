import type { SessionRepository } from '@common/client/session-repository'
import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { SessionItem } from '@govuk-one-login/cri-types'

import { SessionNotFoundError } from '@common/error/session-not-found-error'
import { getEndpointProfileForClientId } from '@common/model/oauth-client-id'
import { logger } from '@govuk-one-login/cri-logger'

export interface SessionContext {
  profile: EndpointProfile
  session: SessionItem
}

export const requireSessionContext = async (
  sessionRepository: SessionRepository,
  sessionId: string
): Promise<SessionContext> => {
  const session = await sessionRepository.findBySessionId(sessionId)
  if (!session) throw new SessionNotFoundError()
  logger.appendKeys({
    cri_session_id: session.sessionId,
    govuk_signin_journey_id: session.clientSessionId
  })

  const profile = getEndpointProfileForClientId(session.clientId)
  logger.appendKeys({ profile })

  logger.info('Session retrieved')

  return { profile, session }
}
