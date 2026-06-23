import type { TokenEntity } from '@src/token-rotator/model/token-entity'

import { TokenProfile } from '@src/token-rotator/model/token-profile'
import { tokenRetrievalService } from '@src/token-rotator/service/token-retrieval-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { tokenRepositoryMock } = vi.hoisted(() => ({
  tokenRepositoryMock: {
    getToken: vi.fn(),
    putToken: vi.fn()
  }
}))

vi.mock('@src/token-rotator/client/token-repository', () => ({
  tokenRepository: tokenRepositoryMock
}))

const NOW_SECONDS = 690_768_000 // 1991-11-22T00:00:00Z
const FRESH_TOKEN_TTL = NOW_SECONDS + 1000
const EXPIRED_TOKEN_TTL = NOW_SECONDS - 60

const buildTokenEntity = (overrides: Partial<TokenEntity> = {}): TokenEntity => ({
  id: TokenProfile.STUB,
  tokenValue: 'cached-token',
  ttl: FRESH_TOKEN_TTL,
  ...overrides
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW_SECONDS * 1000))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('token-retrieval-service', () => {
  describe('retrieveToken', () => {
    it('returns the cached token value when the entity is fresh', async () => {
      tokenRepositoryMock.getToken.mockResolvedValueOnce(buildTokenEntity())

      const token = await tokenRetrievalService.retrieveToken(TokenProfile.STUB)

      expect(token).toBe('cached-token')
      expect(tokenRepositoryMock.getToken).toHaveBeenCalledWith(TokenProfile.STUB)
    })

    it('returns undefined when no token is cached for the profile', async () => {
      tokenRepositoryMock.getToken.mockResolvedValueOnce(undefined)

      const token = await tokenRetrievalService.retrieveToken(TokenProfile.STUB)

      expect(token).toBeUndefined()
    })

    it('returns undefined when the cached token has expired', async () => {
      tokenRepositoryMock.getToken.mockResolvedValueOnce(
        buildTokenEntity({ ttl: EXPIRED_TOKEN_TTL })
      )

      const token = await tokenRetrievalService.retrieveToken(TokenProfile.STUB)

      expect(token).toBeUndefined()
    })
  })
})
