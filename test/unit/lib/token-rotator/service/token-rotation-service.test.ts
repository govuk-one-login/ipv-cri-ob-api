import type { CredentialsProvider } from '@lib/token-rotator/client/ssm-credentials-provider'
import type { TokenCredentials } from '@lib/token-rotator/model/token-credentials'
import type { TokenEntity } from '@lib/token-rotator/model/token-entity'
import type { TokenRepository } from '@lib/token-rotator/model/token-repository'
import type { TokenRotationStrategy } from '@lib/token-rotator/model/token-rotation-strategy'

import { TokenRotationError } from '@lib/token-rotator/error/token-rotation-errors'
import { TokenProfile } from '@lib/token-rotator/model/token-profile'
import {
  createTokenRotationService,
  type TokenRotationServiceConfig
} from '@lib/token-rotator/service/token-rotation-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const REFRESH_WINDOW = 300
const NOW_SECONDS = 690_768_000 // 1991-11-22T00:00:00Z
const FRESH_TOKEN_TTL = NOW_SECONDS + 1000
const STALE_TOKEN_TTL = NOW_SECONDS + (REFRESH_WINDOW - 100)
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
  refreshWindowSeconds: REFRESH_WINDOW,
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

    it('rotates both profiles when one is stale and the other is uncached', async () => {
      const credentialsProvider = mockCredentialsProvider()
      const tokenRepository = mockTokenRepository()
      tokenRepository.getToken = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(buildTokenEntity({ id: TokenProfile.UAT, ttl: STALE_TOKEN_TTL }))
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(
        buildConfig({ profiles: [TokenProfile.STUB, TokenProfile.UAT] }),
        { credentialsProvider, tokenRepository, tokenRotationStrategy }
      )

      await service.rotateAll()

      expect(credentialsProvider.getCredentials).toHaveBeenCalledTimes(2)
      expect(credentialsProvider.getCredentials).toHaveBeenCalledWith('/test/tokens/STUB')
      expect(credentialsProvider.getCredentials).toHaveBeenCalledWith('/test/tokens/UAT')
      expect(tokenRotationStrategy.rotate).toHaveBeenCalledTimes(2)
      expect(tokenRepository.putToken).toHaveBeenCalledTimes(2)
      expect(tokenRepository.putToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: TokenProfile.STUB })
      )
      expect(tokenRepository.putToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: TokenProfile.UAT })
      )
    })

    it('only rotates the stale profile when another profile is still fresh', async () => {
      const credentialsProvider = mockCredentialsProvider()
      const tokenRepository = mockTokenRepository()
      tokenRepository.getToken = vi
        .fn()
        .mockResolvedValueOnce(buildTokenEntity({ id: TokenProfile.UAT, ttl: FRESH_TOKEN_TTL }))
        .mockResolvedValueOnce(buildTokenEntity({ id: TokenProfile.LIVE, ttl: STALE_TOKEN_TTL }))
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(
        buildConfig({ profiles: [TokenProfile.UAT, TokenProfile.LIVE] }),
        { credentialsProvider, tokenRepository, tokenRotationStrategy }
      )

      await service.rotateAll()

      expect(credentialsProvider.getCredentials).toHaveBeenCalledOnce()
      expect(credentialsProvider.getCredentials).toHaveBeenCalledWith('/test/tokens/LIVE')
      expect(tokenRotationStrategy.rotate).toHaveBeenCalledOnce()
      expect(tokenRepository.putToken).toHaveBeenCalledOnce()
      expect(tokenRepository.putToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: TokenProfile.LIVE })
      )
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

    describe('when force is true', () => {
      it('rotates every profile even when the cached token is still fresh', async () => {
        const credentialsProvider = mockCredentialsProvider()
        const tokenRepository = mockTokenRepository()

        tokenRepository.getToken = vi
          .fn()
          .mockResolvedValueOnce(buildTokenEntity({ id: TokenProfile.STUB, ttl: FRESH_TOKEN_TTL }))
          .mockResolvedValueOnce(buildTokenEntity({ id: TokenProfile.UAT, ttl: FRESH_TOKEN_TTL }))

        const tokenRotationStrategy = buildStrategy()

        const service = createTokenRotationService(
          buildConfig({ profiles: [TokenProfile.STUB, TokenProfile.UAT] }),
          { credentialsProvider, tokenRepository, tokenRotationStrategy }
        )

        await service.rotateAll({ force: true })

        expect(credentialsProvider.getCredentials).toHaveBeenCalledTimes(2)
        expect(tokenRotationStrategy.rotate).toHaveBeenCalledTimes(2)
        expect(tokenRepository.putToken).toHaveBeenCalledTimes(2)
        expect(tokenRepository.putToken).toHaveBeenCalledWith(
          expect.objectContaining({ id: TokenProfile.STUB })
        )
        expect(tokenRepository.putToken).toHaveBeenCalledWith(
          expect.objectContaining({ id: TokenProfile.UAT })
        )
      })

      it('does not read existing tokens when force is true', async () => {
        const credentialsProvider = mockCredentialsProvider()
        const tokenRepository = mockTokenRepository()
        const tokenRotationStrategy = buildStrategy()

        const service = createTokenRotationService(buildConfig(), {
          credentialsProvider,
          tokenRepository,
          tokenRotationStrategy
        })

        await service.rotateAll({ force: true })

        expect(tokenRepository.getToken).not.toHaveBeenCalled()
      })
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
