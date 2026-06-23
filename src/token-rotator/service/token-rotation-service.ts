import type { ConfigProvider } from '@src/token-rotator/client/ssm-config-provider'
import type { TokenRepository } from '@src/token-rotator/client/token-repository'
import type { ProviderCredentials } from '@src/token-rotator/model/provider-credentials'
import type { TokenProfile } from '@src/token-rotator/model/token-profile'
import type { TokenRotationStrategy } from '@src/token-rotator/model/token-rotation-strategy'

import { logger } from '@govuk-one-login/cri-logger'
import {
  AggregateRotationError,
  type RotationFailure,
  TokenRotationError
} from '@src/token-rotator/error/token-rotation-errors'
import { formatTokenExpiry, isTokenDueForRotation } from '@src/token-rotator/util/token-expiry'

export interface TokenRotationService {
  rotateAll: () => Promise<void>
  rotateOne: (override: TokenRotationOverride) => Promise<void>
}

export interface TokenRotationServiceConfig {
  configPathPrefix: string
  profiles: TokenProfile[]
  refreshWindowSeconds: number
}

interface TokenRotationOverride {
  credentials: ProviderCredentials
  profile: TokenProfile
}

interface TokenRotationServiceCollaborators {
  configProvider: ConfigProvider
  tokenRepository: TokenRepository
  tokenRotationStrategy: TokenRotationStrategy
}

export const createTokenRotationService = (
  config: TokenRotationServiceConfig,
  collaborators: TokenRotationServiceCollaborators
): TokenRotationService => {
  const rotate = async (profile: TokenProfile, credentials: ProviderCredentials): Promise<void> => {
    const { expiresAtSeconds, tokenValue } =
      await collaborators.tokenRotationStrategy.rotate(credentials)
    await collaborators.tokenRepository.putToken({
      id: profile,
      tokenValue,
      ttl: expiresAtSeconds
    })
    logger.info('Token rotated', { expiresAt: formatTokenExpiry(expiresAtSeconds), profile })
  }

  const rotateFromConfig = async (profile: TokenProfile): Promise<void> => {
    const currentToken = await collaborators.tokenRepository.getToken(profile)
    if (currentToken && !isTokenDueForRotation(currentToken, config.refreshWindowSeconds)) {
      logger.info('Token still fresh, skipping rotation', { profile })
      return
    }
    const credentials = await collaborators.configProvider.getConfig(
      `${config.configPathPrefix}/${profile}`
    )
    await rotate(profile, credentials)
  }

  return {
    rotateAll: async () => {
      const results = await Promise.allSettled(
        config.profiles.map((profile) => rotateFromConfig(profile))
      )

      const failures: RotationFailure[] = results.flatMap((result, index) => {
        if (result.status === 'fulfilled') return []
        const profile = config.profiles[index]!
        const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error'
        logger.error('Token rotation failed', { profile, reason })
        return [{ profile, reason }]
      })

      if (failures.length > 0) throw new AggregateRotationError(failures)
    },
    rotateOne: async ({ credentials, profile }) => {
      if (!config.profiles.includes(profile)) {
        throw new TokenRotationError(`Profile not enabled for this deployment: ${profile}`)
      }
      await rotate(profile, credentials)
    }
  }
}
