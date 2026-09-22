import type { SessionRepository } from '@common/client/session-repository'
import type { SessionItem } from '@govuk-one-login/cri-types'
import type { MockInstance } from 'vitest'

import { SessionNotFoundError } from '@common/error/session-not-found-error'
import { EndpointProfile } from '@common/model/endpoint-profile'
import { OAuthClientId } from '@common/model/oauth-client-id'
import { requireSessionContext } from '@common/service/session-context'
import { logger } from '@govuk-one-login/cri-logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SESSION_ID = 'session-abc'

const buildSession = (clientId: string = OAuthClientId.IPV_CORE_STUB): SessionItem =>
  ({
    clientId,
    clientSessionId: 'client-session-123',
    sessionId: SESSION_ID
  }) as SessionItem

const buildTestContext = () => {
  const findBySessionId = vi.fn().mockResolvedValue(buildSession())
  const sessionRepository: SessionRepository = {
    findByAccessToken: vi.fn(),
    findBySessionId
  }

  return { findBySessionId, sessionRepository }
}

describe('requireSessionContext', () => {
  let appendKeysSpy: MockInstance<typeof logger.appendKeys>

  beforeEach(() => {
    appendKeysSpy = vi.spyOn(logger, 'appendKeys').mockImplementation(() => {})
    vi.spyOn(logger, 'info').mockImplementation(() => {})
  })

  it('returns the session and the profile its client maps to', async () => {
    const { findBySessionId, sessionRepository } = buildTestContext()
    const liveSession = buildSession(OAuthClientId.IPV_CORE)
    findBySessionId.mockResolvedValue(liveSession)

    await expect(requireSessionContext(sessionRepository, SESSION_ID)).resolves.toEqual({
      profile: EndpointProfile.LIVE,
      session: liveSession
    })
  })

  it('appends required log keys', async () => {
    const { sessionRepository } = buildTestContext()

    await requireSessionContext(sessionRepository, SESSION_ID)

    expect(appendKeysSpy).toHaveBeenCalledWith({
      cri_session_id: SESSION_ID,
      govuk_signin_journey_id: 'client-session-123'
    })
    expect(appendKeysSpy).toHaveBeenCalledWith({ profile: EndpointProfile.STUB })
  })

  it('throws when the session does not exist', async () => {
    const { findBySessionId, sessionRepository } = buildTestContext()
    findBySessionId.mockResolvedValue(undefined)

    await expect(requireSessionContext(sessionRepository, SESSION_ID)).rejects.toThrow(
      SessionNotFoundError
    )
  })
})
