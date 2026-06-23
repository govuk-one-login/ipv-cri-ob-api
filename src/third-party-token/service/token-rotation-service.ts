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

export interface TokenRotationService {
  rotateAll: () => Promise<void>
  rotateOne: (override: TokenRotationOverride) => Promise<void>
}

export interface TokenRotationServiceConfig {
  profiles: ConfigProfileName[]
  refreshWindowSeconds: number
  ssmPathPrefix: string
}

interface TokenRotationOverride {
  overrideRequest: Record<string, string>
  profile: ConfigProfileName
}

interface TokenRotationServiceCollaborators<TRequest> {
  configProvider: ConfigProvider
  tokenRepository: TokenRepository
  tokenRotationStrategy: TokenRotationStrategy<TRequest>
}

export const createTokenRotationService = <TRequest>(
  config: TokenRotationServiceConfig,
  collaborators: TokenRotationServiceCollaborators<TRequest>
): TokenRotationService => {
  const doRotate = async (
    profile: ConfigProfileName,
    rawRequest: Record<string, string>
  ): Promise<void> => {
    const parsedRequest = collaborators.tokenRotationStrategy.requestSchema.safeParse(rawRequest)
    if (!parsedRequest.success) {
      throw new TokenRotationError(
        `Invalid token request for ${profile}: ${parsedRequest.error.message}`
      )
    }
    const { expiresAtSeconds, tokenValue } = await collaborators.tokenRotationStrategy.rotate({
      request: parsedRequest.data
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
    rawRequest: Record<string, string>,
    currentToken: TokenEntity | undefined
  ): Promise<void> => {
    try {
      await doRotate(profile, rawRequest)
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
    const rawRequest = await collaborators.configProvider.getConfig(
      `${config.ssmPathPrefix}/${profile}`
    )
    await rotateAndClearOnFailure(profile, rawRequest, currentToken)
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
    rotateOne: async ({ overrideRequest, profile }) => {
      if (!config.profiles.includes(profile)) {
        throw new TokenRotationError(`Profile not enabled for this deployment: ${profile}`)
      }
      const currentToken = await collaborators.tokenRepository.getToken(profile)
      await rotateAndClearOnFailure(profile, overrideRequest, currentToken)
    }
  }
}
