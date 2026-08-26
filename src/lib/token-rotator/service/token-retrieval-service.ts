import type { TokenProfile } from '@lib/token-rotator/model/token-profile'
import type { TokenRepository } from '@lib/token-rotator/model/token-repository'

import { logger } from '@govuk-one-login/cri-logger'
import { formatTokenExpiry, isTokenExpiredForRead } from '@lib/token-rotator/util/token-expiry'

export interface TokenRetrievalService {
  retrieveToken: (profile: TokenProfile) => Promise<string | undefined>
}

interface TokenRetrievalServiceCollaborators {
  tokenRepository: TokenRepository
}

export const createTokenRetrievalService = (
  collaborators: TokenRetrievalServiceCollaborators
): TokenRetrievalService => ({
  retrieveToken: async (profile) => {
    const tokenEntity = await collaborators.tokenRepository.getToken(profile)
    if (!tokenEntity) {
      logger.warn('No cached token found', { profile })
      return undefined
    }
    if (isTokenExpiredForRead(tokenEntity)) {
      logger.warn('Cached token has expired', {
        expiredAt: formatTokenExpiry(tokenEntity.ttl),
        profile
      })
      return undefined
    }
    return tokenEntity.tokenValue
  }
})
