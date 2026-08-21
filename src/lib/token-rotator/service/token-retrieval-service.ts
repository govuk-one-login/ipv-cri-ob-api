import type { DynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import type { TokenProfile } from '@lib/token-rotator/model/token-profile'

import { logger } from '@govuk-one-login/cri-logger'
import { dynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import { formatTokenExpiry, isTokenExpiredForRead } from '@lib/token-rotator/util/token-expiry'

export interface TokenRetrievalService {
  retrieveToken: (profile: TokenProfile) => Promise<string | undefined>
}

interface TokenRetrievalServiceCollaborators {
  tokenRepository: DynamoTokenRepository
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

export const tokenRetrievalService = createTokenRetrievalService({
  tokenRepository: dynamoTokenRepository
})
