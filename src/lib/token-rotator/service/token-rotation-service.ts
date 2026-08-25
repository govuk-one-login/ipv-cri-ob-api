import type { CredentialsProvider } from '@lib/token-rotator/client/ssm-credentials-provider'
import type { TokenCredentials } from '@lib/token-rotator/model/token-credentials'
import type { TokenProfile } from '@lib/token-rotator/model/token-profile'
import type { TokenRepository } from '@lib/token-rotator/model/token-repository'
import type { TokenRotationStrategy } from '@lib/token-rotator/model/token-rotation-strategy'

import { logger } from '@govuk-one-login/cri-logger'
import {
  AggregateRotationError,
  type RotationFailure
} from '@lib/token-rotator/error/token-rotation-errors'
import { formatTokenExpiry, isTokenDueForRotation } from '@lib/token-rotator/util/token-expiry'

export interface TokenRotationService {
  rotateAll: () => Promise<void>
}

export interface TokenRotationServiceConfig {
  credentialsPathPrefix: string
  profiles: TokenProfile[]
  refreshWindowSeconds: number
}

interface TokenRotationServiceCollaborators {
  credentialsProvider: CredentialsProvider
  tokenRepository: TokenRepository
  tokenRotationStrategy: TokenRotationStrategy
}

export const createTokenRotationService = (
  config: TokenRotationServiceConfig,
  collaborators: TokenRotationServiceCollaborators
): TokenRotationService => {
  const doRotate = async (profile: TokenProfile, credentials: TokenCredentials): Promise<void> => {
    const { expiresAtSeconds, tokenValue } =
      await collaborators.tokenRotationStrategy.rotate(credentials)
    await collaborators.tokenRepository.putToken({
      id: profile,
      tokenValue,
      ttl: expiresAtSeconds
    })
    logger.info('Token rotated', { expiresAt: formatTokenExpiry(expiresAtSeconds), profile })
  }

  const rotateForProfile = async (profile: TokenProfile): Promise<void> => {
    const currentToken = await collaborators.tokenRepository.getToken(profile)
    if (currentToken && !isTokenDueForRotation(currentToken, config.refreshWindowSeconds)) {
      logger.info('Token still fresh, skipping rotation', { profile })
      return
    }
    const credentials = await collaborators.credentialsProvider.getCredentials(
      `${config.credentialsPathPrefix}/${profile}`
    )
    await doRotate(profile, credentials)
  }

  return {
    rotateAll: async () => {
      const results = await Promise.allSettled(
        config.profiles.map((profile) => rotateForProfile(profile))
      )

      const failures: RotationFailure[] = results.flatMap((result, index) => {
        if (result.status === 'fulfilled') return []
        const profile = config.profiles[index]!
        const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error'
        logger.error('Token rotation failed', { profile, reason })
        return [{ profile, reason }]
      })

      if (failures.length > 0) throw new AggregateRotationError(failures)
    }
  }
}
