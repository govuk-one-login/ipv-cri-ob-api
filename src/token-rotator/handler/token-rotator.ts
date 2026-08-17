import type { CredentialsProvider } from '@src/token-rotator/client/ssm-credentials-provider'
import type { TokenRepository } from '@src/token-rotator/client/token-repository'
import type { TokenRotationStrategy } from '@src/token-rotator/model/token-rotation-strategy'
import type { TokenRotationServiceConfig } from '@src/token-rotator/service/token-rotation-service'
import type { CloudFormationCustomResourceEvent, ScheduledEvent } from 'aws-lambda'

import { createTokenRotationService } from '@src/token-rotator/service/token-rotation-service'

export type TokenRotatorEvent = CloudFormationCustomResourceEvent | ScheduledEvent

interface TokenRotatorCollaborators {
  credentialsProvider: CredentialsProvider
  tokenRepository: TokenRepository
  tokenRotationStrategy: TokenRotationStrategy
}

const isCfnCustomResourceEvent = (event: unknown): event is CloudFormationCustomResourceEvent =>
  typeof event === 'object' && event !== null && 'RequestType' in event && 'ResponseURL' in event

/**
 * `ScheduledEvent` triggers `rotateAll`, which iterates the configured profiles, fetches each
 * profile's credentials from the configured `CredentialsProvider`, skips any token still inside the
 * refresh window, and retrieves a new token via the `TokenRotationStrategy`.
 *
 * `CloudFormationCustomResourceEvent` (Create/Update) forces rotation of all configured profiles.
 */
export const createTokenRotator = (
  config: TokenRotationServiceConfig,
  collaborators: TokenRotatorCollaborators
) => {
  const tokenRotationService = createTokenRotationService(config, collaborators)

  return async (event: TokenRotatorEvent): Promise<void> => {
    if (isCfnCustomResourceEvent(event)) {
      if (event.RequestType === 'Delete') return
      await tokenRotationService.rotateAll({ force: true })
      return
    }
    await tokenRotationService.rotateAll()
  }
}
