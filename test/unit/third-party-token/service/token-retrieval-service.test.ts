import type { TokenEntity } from '@src/third-party-token/model/token-entity'

import { ConfigProfileName } from '@src/third-party-token/model/config-profile'
import { tokenRetrievalService } from '@src/third-party-token/service/token-retrieval-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { tokenRepositoryMock } = vi.hoisted(() => ({
  tokenRepositoryMock: {
    clearToken: vi.fn(),
    getToken: vi.fn(),
    putToken: vi.fn()
  }
}))

vi.mock('@src/third-party-token/client/token-repository', () => ({
  tokenRepository: tokenRepositoryMock
}))

const NOW_SECONDS = 690_768_000 // 1991-11-22T00:00:00Z
const FRESH_TOKEN_TTL = NOW_SECONDS + 1000
const EXPIRED_TOKEN_TTL = NOW_SECONDS - 60

const buildTokenEntity = (overrides: Partial<TokenEntity> = {}): TokenEntity => ({
  id: ConfigProfileName.STUB,
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

      const token = await tokenRetrievalService.retrieveToken(ConfigProfileName.STUB)

      expect(token).toBe('cached-token')
      expect(tokenRepositoryMock.getToken).toHaveBeenCalledWith(ConfigProfileName.STUB)
    })

    it('returns undefined when no token is cached for the profile', async () => {
      tokenRepositoryMock.getToken.mockResolvedValueOnce(undefined)

      const token = await tokenRetrievalService.retrieveToken(ConfigProfileName.STUB)

      expect(token).toBeUndefined()
    })

    it('returns undefined when the cached token has expired', async () => {
      tokenRepositoryMock.getToken.mockResolvedValueOnce(
        buildTokenEntity({ ttl: EXPIRED_TOKEN_TTL })
      )

      const token = await tokenRetrievalService.retrieveToken(ConfigProfileName.STUB)

      expect(token).toBeUndefined()
    })
  })
})
