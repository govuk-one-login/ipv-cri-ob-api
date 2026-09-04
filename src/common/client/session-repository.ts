import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { SessionItem } from '@govuk-one-login/cri-types'

import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { OAuthClientId } from '@common/model/oauth-client-id'
import { requireEnv } from '@common/util/env'

export interface SessionRepository {
  findByAccessToken: (accessToken: string) => Promise<SessionItem | undefined>
  findBySessionId: (sessionId: string) => Promise<SessionItem | undefined>
}

interface SessionRepositoryConfig {
  tableName: string
}

const DUMMY_SESSION = {
  attemptCount: 0,
  clientId: OAuthClientId.IPV_CORE_STUB_AWS_BUILD_THIRD_PARTY,
  clientSessionId: 'govuk-signin-journey-123',
  createdDate: 0,
  expiryDate: 0,
  redirectUri: 'https://example.test/callback',
  sessionId: 'session-123',
  state: 'test-state',
  subject: 'subject-xyz'
} as SessionItem

export const createSessionRepository = (
  _config: SessionRepositoryConfig,
  _client: DynamoDBDocumentClient
): SessionRepository => ({
  findBySessionId: (_sessionId) =>
    // TODO: delete me and get the actual session
    Promise.resolve(DUMMY_SESSION),

  findByAccessToken: (_accessToken) =>
    // TODO: delete me and get the actual session
    Promise.resolve(DUMMY_SESSION)
})

export const getSessionRepository = () =>
  createSessionRepository(
    { tableName: requireEnv('SESSION_DB_TABLE_NAME') },
    dynamoDBDocumentClient
  )
