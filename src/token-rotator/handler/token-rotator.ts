import type { CredentialsProvider } from '@src/token-rotator/client/ssm-credentials-provider'
import type { TokenRepository } from '@src/token-rotator/client/token-repository'
import type { TokenRotationStrategy } from '@src/token-rotator/model/token-rotation-strategy'
import type { TokenRotationServiceConfig } from '@src/token-rotator/service/token-rotation-service'
import type { ScheduledEvent } from 'aws-lambda'

import { createTokenRotationService } from '@src/token-rotator/service/token-rotation-service'

interface TokenRotatorCollaborators {
  credentialsProvider: CredentialsProvider
  tokenRepository: TokenRepository
  tokenRotationStrategy: TokenRotationStrategy
}

/**
 * any `ScheduledEvent` triggers `rotateAll`, which iterates the configured profiles, fetches each
 * profile's credentials from the configured `CredentialsProvider`, skips any token still inside the
 * refresh window, and saves a new token via the plugin's `TokenRotationStrategy`
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
