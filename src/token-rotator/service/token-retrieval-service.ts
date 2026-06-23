import type { TokenRepository } from '@src/token-rotator/client/token-repository'
import type { TokenProfile } from '@src/token-rotator/model/token-profile'

import { logger } from '@govuk-one-login/cri-logger'
import { tokenRepository } from '@src/token-rotator/client/token-repository'
import { formatTokenExpiry, isTokenExpiredForRead } from '@src/token-rotator/util/token-expiry'

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
    const entity = await collaborators.tokenRepository.getToken(profile)
    if (!entity) {
      logger.info('No cached token found', { profile })
      return undefined
    }
    if (isTokenExpiredForRead(entity)) {
      logger.warn('Cached token has expired', {
        expiredAt: formatTokenExpiry(entity.ttl),
        profile
      })
      return undefined
    }
    return entity.tokenValue
  }
})

export const tokenRetrievalService = createTokenRetrievalService({ tokenRepository })
