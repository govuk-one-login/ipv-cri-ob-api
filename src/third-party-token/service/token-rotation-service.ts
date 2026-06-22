import type { ConfigProvider } from '@src/third-party-token/client/config-provider'
import type { TokenRepository } from '@src/third-party-token/client/token-repository'
import type { ConfigProfileName } from '@src/third-party-token/model/config-profile'
import type { TokenEntity } from '@src/third-party-token/model/token-entity'
import type { TokenRotationStrategy } from '@src/third-party-token/model/token-rotation-strategy'

import { logger } from '@govuk-one-login/cri-logger'
import {
  AggregateRotationError,
  type RotationFailure,
  TokenRotationError
} from '@src/third-party-token/error/token-rotation-errors'
import { formatTokenExpiry, isTokenDueForRotation } from '@src/third-party-token/util/token-expiry'

export interface TokenRotationOverride {
  overrideConfig: Record<string, string>
  profile: ConfigProfileName
}

export interface TokenRotationService {
  rotateAll: () => Promise<void>
  rotateOne: (override: TokenRotationOverride) => Promise<void>
}

export interface TokenRotationServiceConfig {
  allowInvocationOverrides?: boolean
  profiles: ConfigProfileName[]
  refreshWindowSeconds: number
  ssmPathPrefix: string
}

interface TokenRotationServiceCollaborators<TConfig> {
  configProvider: ConfigProvider
  tokenRepository: TokenRepository
  tokenRotationStrategy: TokenRotationStrategy<TConfig>
}

export const createTokenRotationService = <TConfig>(
  config: TokenRotationServiceConfig,
  collaborators: TokenRotationServiceCollaborators<TConfig>
): TokenRotationService => {
  const doRotate = async (
    profile: ConfigProfileName,
    providerConfig: Record<string, string>
  ): Promise<void> => {
    const parsedConfig = collaborators.tokenRotationStrategy.configSchema.safeParse(providerConfig)
    if (!parsedConfig.success) {
      throw new TokenRotationError(`Invalid config for ${profile}: ${parsedConfig.error.message}`)
    }
    const { expiresAtSeconds, tokenValue } = await collaborators.tokenRotationStrategy.rotate({
      config: parsedConfig.data
    })
    await collaborators.tokenRepository.putToken({
      id: profile,
      tokenValue,
      ttl: expiresAtSeconds
    })
    logger.info('Token rotated', { expiresAt: formatTokenExpiry(expiresAtSeconds), profile })
  }

  const clearIfExpired = async (
    profile: ConfigProfileName,
    currentToken: TokenEntity | undefined
  ): Promise<void> => {
    if (!currentToken || !isTokenDueForRotation(currentToken, 0)) return
    await collaborators.tokenRepository.clearToken(profile)
    logger.warn('Cleared expired token after rotation failure', {
      expiredAt: formatTokenExpiry(currentToken.ttl),
      profile
    })
  }

  const rotateAndClearOnFailure = async (
    profile: ConfigProfileName,
    providerConfig: Record<string, string>,
    currentToken: TokenEntity | undefined
  ): Promise<void> => {
    try {
      await doRotate(profile, providerConfig)
    } catch (error) {
      await clearIfExpired(profile, currentToken)
      throw error
    }
  }

  const rotateFromScheduledSource = async (profile: ConfigProfileName): Promise<void> => {
    const currentToken = await collaborators.tokenRepository.getToken(profile)
    if (currentToken && !isTokenDueForRotation(currentToken, config.refreshWindowSeconds)) {
      logger.info('Token still fresh, skipping rotation', { profile })
      return
    }
    const providerConfig = await collaborators.configProvider.getConfig(
      `${config.ssmPathPrefix}/${profile}`
    )
    await rotateAndClearOnFailure(profile, providerConfig, currentToken)
  }

  return {
    rotateAll: async () => {
      const results = await Promise.allSettled(
        config.profiles.map((profile) => rotateFromScheduledSource(profile))
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
    rotateOne: async ({ overrideConfig, profile }) => {
      if (!config.profiles.includes(profile)) {
        throw new TokenRotationError(`Profile not enabled for this deployment: ${profile}`)
      }
      const currentToken = await collaborators.tokenRepository.getToken(profile)
      await rotateAndClearOnFailure(profile, overrideConfig, currentToken)
    }
  }
}
