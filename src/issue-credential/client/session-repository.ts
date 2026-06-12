import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { SessionItem } from '@govuk-one-login/cri-types'

import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'

export interface SessionRepository {
  findByAccessToken: (accessToken: string) => Promise<SessionItem | undefined>
}

export const createSessionRepository = (_client: DynamoDBDocumentClient): SessionRepository => ({
  findByAccessToken: (_accessToken) =>
    // TODO: delete me and get the actual session
    Promise.resolve({
      attemptCount: 0,
      clientId: 'test-client',
      clientSessionId: 'govuk-signin-journey-123',
      createdDate: 0,
      expiryDate: 0,
      redirectUri: 'https://example.test/callback',
      sessionId: 'session-123',
      state: 'test-state',
      subject: 'subject-xyz'
    } as SessionItem)
})

export const sessionRepository = createSessionRepository(dynamoDBDocumentClient)
