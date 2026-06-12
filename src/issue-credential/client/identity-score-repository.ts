import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { IdentityScore } from '@src/issue-credential/model/identity-score'

import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'

export interface IdentityScoreRepository {
  findBySessionId: (sessionId: string) => Promise<IdentityScore | undefined>
}

export const createIdentityScoreRepository = (
  _client: DynamoDBDocumentClient
): IdentityScoreRepository => ({
  findBySessionId: (_sessionId) =>
    // TODO: delete me and get the actual identity score
    Promise.resolve({
      checkDetails: ['data', 'auth'],
      contraIndicators: [],
      failedCheckDetails: [],
      sessionId: 'session-123',
      strengthScore: 3,
      transactionId: 'ob-001',
      ttl: 0,
      validityScore: 2,
      verificationScore: 3
    } as IdentityScore)
})

export const identityScoreRepository = createIdentityScoreRepository(dynamoDBDocumentClient)
