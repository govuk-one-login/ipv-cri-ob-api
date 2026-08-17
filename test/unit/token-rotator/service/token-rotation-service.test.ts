import type { CredentialsProvider } from '@src/token-rotator/client/ssm-credentials-provider'
import type { TokenRepository } from '@src/token-rotator/client/token-repository'
import type { ProviderCredentials } from '@src/token-rotator/model/provider-credentials'
import type { TokenEntity } from '@src/token-rotator/model/token-entity'
import type { TokenRotationStrategy } from '@src/token-rotator/model/token-rotation-strategy'

import { TokenRotationError } from '@src/token-rotator/error/token-rotation-errors'
import { TokenProfile } from '@src/token-rotator/model/token-profile'
import {
  createTokenRotationService,
  type TokenRotationServiceConfig
} from '@src/token-rotator/service/token-rotation-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW_SECONDS = 690_768_000 // 1991-11-22T00:00:00Z
const FRESH_TOKEN_TTL = NOW_SECONDS + 1000

const PROVIDER_CREDENTIALS: ProviderCredentials = {
  'client-id': 'test-client-id',
  'client-secret': 'top-secret', // pragma: allowlist secret
  'endpoint-url': 'https://provider.test/token',
  'grant-type': 'client_credentials',
  scope: 'accounts'
}

const ROTATED_TOKEN = 'new-access-token'

const buildConfig = (
  overrides: Partial<TokenRotationServiceConfig> = {}
): TokenRotationServiceConfig => ({
  credentialsPathPrefix: '/test/third-party-tokens',
  profiles: [TokenProfile.STUB],
  refreshWindowSeconds: 300,
  ...overrides
})

const buildStrategy = (
  rotate: TokenRotationStrategy['rotate'] = vi.fn().mockResolvedValue({
    expiresAtSeconds: FRESH_TOKEN_TTL,
    tokenValue: ROTATED_TOKEN
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

const mockTokenRepository = (): TokenRepository => ({
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
      expect(credentialsProvider.getCredentials).toHaveBeenCalledWith(
        '/test/third-party-tokens/STUB'
      )
      expect(credentialsProvider.getCredentials).toHaveBeenCalledWith(
        '/test/third-party-tokens/LIVE'
      )
      expect(tokenRotationStrategy.rotate).toHaveBeenNthCalledWith(2, PROVIDER_CREDENTIALS)
      expect(tokenRepository.putToken).toHaveBeenCalledTimes(2)
      expect(tokenRepository.putToken).toHaveBeenCalledWith({
        id: 'STUB',
        tokenValue: ROTATED_TOKEN,
        ttl: FRESH_TOKEN_TTL
      })
      expect(tokenRepository.putToken).toHaveBeenCalledWith({
        id: 'LIVE',
        tokenValue: ROTATED_TOKEN,
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
          tokenValue: ROTATED_TOKEN
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
        .mockRejectedValueOnce(new Error('SSM unavailable'))
      const tokenRepository = mockTokenRepository()
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(buildConfig(), {
        credentialsProvider,
        tokenRepository,
        tokenRotationStrategy
      })

      await expect(service.rotateAll()).rejects.toMatchObject({
        failures: [{ profile: TokenProfile.STUB, reason: 'SSM unavailable' }],
        name: 'AggregateRotationError'
      })
      expect(tokenRotationStrategy.rotate).not.toHaveBeenCalled()
      expect(tokenRepository.putToken).not.toHaveBeenCalled()
    })

    it('maps putToken failure to the correct profile', async () => {
      const credentialsProvider = mockCredentialsProvider()
      const tokenRepository = mockTokenRepository()
      tokenRepository.putToken = vi.fn().mockRejectedValueOnce(new Error('DynamoDB unavailable'))
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(buildConfig(), {
        credentialsProvider,
        tokenRepository,
        tokenRotationStrategy
      })

      await expect(service.rotateAll()).rejects.toMatchObject({
        failures: [{ profile: TokenProfile.STUB, reason: 'DynamoDB unavailable' }],
        name: 'AggregateRotationError'
      })
      expect(tokenRotationStrategy.rotate).toHaveBeenCalledOnce()
    })
  })
})
