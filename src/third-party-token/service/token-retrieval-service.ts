import type { TokenRepository } from '@src/third-party-token/client/token-repository'
import type { ConfigProfileName } from '@src/third-party-token/model/config-profile'

import { logger } from '@govuk-one-login/cri-logger'
import { tokenRepository } from '@src/third-party-token/client/token-repository'
import { formatTokenExpiry, isTokenExpiredForRead } from '@src/third-party-token/util/token-expiry'

export interface TokenRetrievalService {
  retrieveToken: (profile: ConfigProfileName) => Promise<string | undefined>
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
