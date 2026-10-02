import type { SessionResponse } from '../clients/session-client'
import type { OBWorld } from '../world'

import { getJwt, type TestHarnessOverrides } from './test-harness'

export const createSession = async (
  world: OBWorld,
  overrides?: TestHarnessOverrides
): Promise<void> => {
  const { client_id, request } = await getJwt(overrides)
  const sessionResponse = await world.session.createSession({ client_id, request })
  if (sessionResponse.status() !== 201)
    throw new Error(
      `Session creation failed: ${sessionResponse.status()} ${sessionResponse.text()}`
    )
  const { redirect_uri, session_id, state } = sessionResponse.json<SessionResponse>()
  world.sessionId = session_id
  world.sessionState = state
  world.sessionRedirectUri = redirect_uri
}
