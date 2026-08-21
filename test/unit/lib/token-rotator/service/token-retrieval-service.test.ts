import type { DynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import type { TokenEntity } from '@lib/token-rotator/model/token-entity'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { TokenProfile } = await import('@lib/token-rotator/model/token-profile')
const { createTokenRetrievalService } =
  await import('@lib/token-rotator/service/token-retrieval-service')

const NOW_SECONDS = 690_768_000 // 1991-11-22T00:00:00Z
const FRESH_TOKEN_TTL = NOW_SECONDS + 1000
const EXPIRED_TOKEN_TTL = NOW_SECONDS - 60

vi.hoisted(() => {
  vi.stubEnv('TOKEN_ROTATOR_DB_TABLE_NAME', 'token-table')
})

const buildTokenEntity = (overrides: Partial<TokenEntity> = {}): TokenEntity => ({
  id: TokenProfile.STUB,
  tokenValue: 'cached-token',
  ttl: FRESH_TOKEN_TTL,
  ...overrides
})

const mockTokenRepository = (): DynamoTokenRepository => ({
  getToken: vi.fn().mockResolvedValue(undefined),
  putToken: vi.fn().mockResolvedValue(undefined)
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW_SECONDS * 1000))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('token-retrieval-service', () => {
  describe('retrieveToken', () => {
    it('returns the cached token value when fresh', async () => {
      const tokenRepository = mockTokenRepository()
      tokenRepository.getToken = vi.fn().mockResolvedValue(buildTokenEntity())

      const service = createTokenRetrievalService({ tokenRepository })
      const token = await service.retrieveToken(TokenProfile.STUB)

      expect(token).toBe('cached-token')
      expect(tokenRepository.getToken).toHaveBeenCalledWith(TokenProfile.STUB)
    })

    it('returns undefined when no token is cached for the profile', async () => {
      const service = createTokenRetrievalService({ tokenRepository: mockTokenRepository() })

      const token = await service.retrieveToken(TokenProfile.STUB)

      expect(token).toBeUndefined()
    })

    it('returns undefined when the cached token has expired', async () => {
      const tokenRepository = mockTokenRepository()
      tokenRepository.getToken = vi
        .fn()
        .mockResolvedValue(buildTokenEntity({ ttl: EXPIRED_TOKEN_TTL }))

      const service = createTokenRetrievalService({ tokenRepository })
      const token = await service.retrieveToken(TokenProfile.STUB)

      expect(token).toBeUndefined()
    })
  })
})
