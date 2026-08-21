import type { DynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import type { CredentialsProvider } from '@lib/token-rotator/client/ssm-credentials-provider'
import type { TokenRotationStrategy } from '@lib/token-rotator/model/token-rotation-strategy'
import type { TokenRotationServiceConfig } from '@lib/token-rotator/service/token-rotation-service'
import type { ScheduledEvent } from 'aws-lambda'

import { createTokenRotationService } from '@lib/token-rotator/service/token-rotation-service'

interface TokenRotatorCollaborators {
  credentialsProvider: CredentialsProvider
  tokenRepository: DynamoTokenRepository
  tokenRotationStrategy: TokenRotationStrategy
}

/**
 * `ScheduledEvent` triggers rotateAll, all configured profiles are checked for token freshness, fresh
 * tokens are skipped, stale/expired/missing tokens are rotated
 */
export const createTokenRotator = (
  config: TokenRotationServiceConfig,
  collaborators: TokenRotatorCollaborators
) => {
  const tokenRotationService = createTokenRotationService(config, collaborators)

  return async (_event: ScheduledEvent): Promise<void> => {
    await tokenRotationService.rotateAll()
  }
}
