import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { IdentityScore } from '@common/model/identity-score'

export interface IdentityScoreRepository {
  findBySessionId: (sessionId: string) => Promise<IdentityScore | undefined>
}

export interface IdentityScoreRepositoryConfig {
  tableName: string
}

export const createIdentityScoreRepository = (
  _config: IdentityScoreRepositoryConfig,
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
