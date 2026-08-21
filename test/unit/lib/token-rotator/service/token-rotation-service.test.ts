import type { DynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import type { CredentialsProvider } from '@lib/token-rotator/client/ssm-credentials-provider'
import type { TokenCredentials } from '@lib/token-rotator/model/token-credentials'
import type { TokenEntity } from '@lib/token-rotator/model/token-entity'
import type { TokenRotationStrategy } from '@lib/token-rotator/model/token-rotation-strategy'

import { TokenRotationError } from '@lib/token-rotator/error/token-rotation-errors'
import { TokenProfile } from '@lib/token-rotator/model/token-profile'
import {
  createTokenRotationService,
  type TokenRotationServiceConfig
} from '@lib/token-rotator/service/token-rotation-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW_SECONDS = 690_768_000 // 1991-11-22T00:00:00Z
const FRESH_TOKEN_TTL = NOW_SECONDS + 1000
const FRESH_TOKEN = 'new-access-token'

const PROVIDER_CREDENTIALS: TokenCredentials = {
  'client-id': 'test-client-id',
  'client-secret': 'top-secret', // pragma: allowlist secret
  'endpoint-url': 'https://provider.test/token',
  'grant-type': 'client_credentials',
  scope: 'accounts'
}

const buildConfig = (
  overrides: Partial<TokenRotationServiceConfig> = {}
): TokenRotationServiceConfig => ({
  credentialsPathPrefix: '/test/tokens',
  profiles: [TokenProfile.STUB],
  refreshWindowSeconds: 300,
  ...overrides
})

const buildStrategy = (
  rotate = vi.fn().mockResolvedValue({
    expiresAtSeconds: FRESH_TOKEN_TTL,
    tokenValue: FRESH_TOKEN
  })
): TokenRotationStrategy => ({ rotate })

const buildTokenEntity = (overrides: Partial<TokenEntity> = {}): TokenEntity => ({
  id: TokenProfile.STUB,
  tokenValue: 'cached-token',
  ttl: FRESH_TOKEN_TTL,
  ...overrides
})

const mockCredentialsProvider = (): CredentialsProvider => ({
  getCredentials: vi.fn().mockResolvedValue(PROVIDER_CREDENTIALS)
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

describe('token-rotation-service', () => {
  describe('rotateAll', () => {
    it('writes a new token for each enabled profile when none is cached', async () => {
      const credentialsProvider = mockCredentialsProvider()
      const tokenRepository = mockTokenRepository()
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(
        buildConfig({ profiles: [TokenProfile.STUB, TokenProfile.LIVE] }),
        {
          credentialsProvider,
          tokenRepository,
          tokenRotationStrategy
        }
      )

      await service.rotateAll()

      expect(credentialsProvider.getCredentials).toHaveBeenCalledTimes(2)
      expect(credentialsProvider.getCredentials).toHaveBeenCalledWith('/test/tokens/STUB')
      expect(credentialsProvider.getCredentials).toHaveBeenCalledWith('/test/tokens/LIVE')
      expect(tokenRotationStrategy.rotate).toHaveBeenNthCalledWith(2, PROVIDER_CREDENTIALS)
      expect(tokenRepository.putToken).toHaveBeenCalledTimes(2)
      expect(tokenRepository.putToken).toHaveBeenCalledWith({
        id: 'STUB',
        tokenValue: FRESH_TOKEN,
        ttl: FRESH_TOKEN_TTL
      })
      expect(tokenRepository.putToken).toHaveBeenCalledWith({
        id: 'LIVE',
        tokenValue: FRESH_TOKEN,
        ttl: FRESH_TOKEN_TTL
      })
    })

    it('skips rotation when the cached token is still fresh', async () => {
      const credentialsProvider = mockCredentialsProvider()
      const tokenRepository = mockTokenRepository()
      tokenRepository.getToken = vi.fn().mockResolvedValue(buildTokenEntity())
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(buildConfig(), {
        credentialsProvider,
        tokenRepository,
        tokenRotationStrategy
      })

      await service.rotateAll()

      expect(credentialsProvider.getCredentials).not.toHaveBeenCalled()
      expect(tokenRotationStrategy.rotate).not.toHaveBeenCalled()
      expect(tokenRepository.putToken).not.toHaveBeenCalled()
    })

    it('throws AggregateRotationError when at least one profile fails', async () => {
      const credentialsProvider = mockCredentialsProvider()
      const tokenRepository = mockTokenRepository()
      const rotate = vi
        .fn()
        .mockResolvedValueOnce({
          expiresAtSeconds: FRESH_TOKEN_TTL,
          tokenValue: FRESH_TOKEN
        })
        .mockRejectedValueOnce(new TokenRotationError('crumbs'))
      const tokenRotationStrategy = buildStrategy(rotate)

      const service = createTokenRotationService(
        buildConfig({ profiles: [TokenProfile.STUB, TokenProfile.UAT] }),
        { credentialsProvider, tokenRepository, tokenRotationStrategy }
      )

      await expect(service.rotateAll()).rejects.toMatchObject({
        failures: [{ profile: TokenProfile.UAT, reason: 'crumbs' }],
        name: 'AggregateRotationError'
      })
      expect(tokenRepository.putToken).toHaveBeenCalledTimes(1)
      expect(tokenRepository.putToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: TokenProfile.STUB })
      )
    })

    it('maps credentialsProvider failure to the correct profile', async () => {
      const credentialsProvider = mockCredentialsProvider()
      credentialsProvider.getCredentials = vi
        .fn()
        .mockRejectedValueOnce(new Error('creds unavailable'))
      const tokenRepository = mockTokenRepository()
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(buildConfig(), {
        credentialsProvider,
        tokenRepository,
        tokenRotationStrategy
      })

      await expect(service.rotateAll()).rejects.toMatchObject({
        failures: [{ profile: TokenProfile.STUB, reason: 'creds unavailable' }],
        name: 'AggregateRotationError'
      })
      expect(tokenRotationStrategy.rotate).not.toHaveBeenCalled()
      expect(tokenRepository.putToken).not.toHaveBeenCalled()
    })

    it('maps putToken failure to the correct profile', async () => {
      const credentialsProvider = mockCredentialsProvider()
      const tokenRepository = mockTokenRepository()
      tokenRepository.putToken = vi.fn().mockRejectedValueOnce(new Error('db unavailable'))
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(buildConfig(), {
        credentialsProvider,
        tokenRepository,
        tokenRotationStrategy
      })

      await expect(service.rotateAll()).rejects.toMatchObject({
        failures: [{ profile: TokenProfile.STUB, reason: 'db unavailable' }],
        name: 'AggregateRotationError'
      })
      expect(tokenRotationStrategy.rotate).toHaveBeenCalledOnce()
    })
  })
})
