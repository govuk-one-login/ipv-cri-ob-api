import type { TokenRotationStrategy } from '@src/token-rotator/model/token-rotation-strategy'
import type { ScheduledEvent } from 'aws-lambda'

import { ssmCredentialsProvider } from '@src/token-rotator/client/ssm-credentials-provider'
import { tokenRepository } from '@src/token-rotator/client/token-repository'
import { createTokenRotationService } from '@src/token-rotator/service/token-rotation-service'
import { loadTokenRotatorConfigFromEnv } from '@src/token-rotator/util/load-config-from-env'

interface TokenRotatorCollaborators {
  tokenRotationStrategy: TokenRotationStrategy
}

/**
 * any `ScheduledEvent` triggers `rotateAll`, which iterates the configured profiles, fetches each
 * profile's credentials from the configured `CredentialsProvider`, skips any token still inside the
 * refresh window, and saves a new token via the plugin's `TokenRotationStrategy`
 */
export const createTokenRotator = (collaborators: TokenRotatorCollaborators) => {
  const tokenRotationService = createTokenRotationService(loadTokenRotatorConfigFromEnv(), {
    credentialsProvider: ssmCredentialsProvider,
    tokenRepository,
    tokenRotationStrategy: collaborators.tokenRotationStrategy
  })

  return async (_event: ScheduledEvent): Promise<void> => {
    await tokenRotationService.rotateAll()
  }
}
