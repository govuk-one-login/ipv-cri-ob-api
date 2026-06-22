import type { ConfigProvider } from '@src/third-party-token/client/config-provider'
import type { TokenRepository } from '@src/third-party-token/client/token-repository'
import type { TokenEntity } from '@src/third-party-token/model/token-entity'
import type { TokenRotationStrategy } from '@src/third-party-token/model/token-rotation-strategy'

import {
  AggregateRotationError,
  TokenRotationError
} from '@src/third-party-token/error/token-rotation-errors'
import { ConfigProfileName } from '@src/third-party-token/model/config-profile'
import {
  createTokenRotationService,
  type TokenRotationServiceConfig
} from '@src/third-party-token/service/token-rotation-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const NOW_SECONDS = 690_768_000 // 1991-11-22T00:00:00Z
const FRESH_TOKEN_TTL = NOW_SECONDS + 1000
const EXPIRED_TOKEN_TTL = NOW_SECONDS - 60

const PROVIDER_SSM_CONFIG: Record<string, string> = {
  'client-id': 'test-client-id',
  'client-secret': 'top-secret', // pragma: allowlist secret
  'endpoint-url': 'https://provider.test/token',
  'grant-type': 'client_credentials',
  scope: 'accounts'
}

const ROTATED_TOKEN = 'new-access-token'
const ROTATED_TOKEN_EXPIRES_AT = 1_800_000_000

const buildConfig = (
  overrides: Partial<TokenRotationServiceConfig> = {}
): TokenRotationServiceConfig => ({
  profiles: [ConfigProfileName.STUB],
  refreshWindowSeconds: 300,
  ssmPathPrefix: '/test/third-party-tokens',
  ...overrides
})

const buildStrategy = (
  rotate: TokenRotationStrategy<Record<string, string>>['rotate'] = vi.fn().mockResolvedValue({
    expiresAtSeconds: ROTATED_TOKEN_EXPIRES_AT,
    tokenValue: ROTATED_TOKEN
  })
): TokenRotationStrategy<Record<string, string>> => ({
  configSchema: z.record(z.string(), z.string()),
  rotate
})

const buildTokenEntity = (overrides: Partial<TokenEntity> = {}): TokenEntity => ({
  id: ConfigProfileName.STUB,
  tokenValue: 'cached-token',
  ttl: FRESH_TOKEN_TTL,
  ...overrides
})

const mockConfigProvider = (): ConfigProvider => ({
  getConfig: vi.fn().mockResolvedValue(PROVIDER_SSM_CONFIG)
})

const mockTokenRepository = (): TokenRepository => ({
  clearToken: vi.fn().mockResolvedValue(undefined),
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
    it('writes a fresh token for each enabled config profile when none is cached', async () => {
      const configProvider = mockConfigProvider()
      const tokenRepository = mockTokenRepository()
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(buildConfig(), {
        configProvider,
        tokenRepository,
        tokenRotationStrategy
      })

      await service.rotateAll()

      expect(configProvider.getConfig).toHaveBeenCalledWith('/test/third-party-tokens/STUB')
      expect(tokenRotationStrategy.rotate).toHaveBeenCalledWith({ config: PROVIDER_SSM_CONFIG })
      expect(tokenRepository.putToken).toHaveBeenCalledWith({
        id: 'STUB',
        tokenValue: ROTATED_TOKEN,
        ttl: ROTATED_TOKEN_EXPIRES_AT
      })
    })

    it('skips rotation when the cached token is still fresh', async () => {
      const configProvider = mockConfigProvider()
      const tokenRepository = mockTokenRepository()
      tokenRepository.getToken = vi.fn().mockResolvedValue(buildTokenEntity())
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(buildConfig(), {
        configProvider,
        tokenRepository,
        tokenRotationStrategy
      })

      await service.rotateAll()

      expect(configProvider.getConfig).not.toHaveBeenCalled()
      expect(tokenRotationStrategy.rotate).not.toHaveBeenCalled()
      expect(tokenRepository.putToken).not.toHaveBeenCalled()
    })

    it('throws AggregateRotationError when at least one profile fails', async () => {
      const configProvider = mockConfigProvider()
      const tokenRepository = mockTokenRepository()
      const rotate = vi
        .fn()
        .mockResolvedValueOnce({
          expiresAtSeconds: ROTATED_TOKEN_EXPIRES_AT,
          tokenValue: ROTATED_TOKEN
        })
        .mockRejectedValueOnce(new TokenRotationError('upstream 500'))
      const tokenRotationStrategy = buildStrategy(rotate)

      const service = createTokenRotationService(
        buildConfig({ profiles: [ConfigProfileName.STUB, ConfigProfileName.UAT] }),
        { configProvider, tokenRepository, tokenRotationStrategy }
      )

      await expect(service.rotateAll()).rejects.toMatchObject({
        failures: [{ profile: ConfigProfileName.UAT, reason: 'upstream 500' }],
        name: 'AggregateRotationError'
      })
      expect(tokenRepository.putToken).toHaveBeenCalledTimes(1)
      expect(tokenRepository.putToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: ConfigProfileName.STUB })
      )
    })

    it('clears the cached token when rotation fails and the cached token has expired', async () => {
      const configProvider = mockConfigProvider()
      const tokenRepository = mockTokenRepository()
      tokenRepository.getToken = vi
        .fn()
        .mockResolvedValue(buildTokenEntity({ ttl: EXPIRED_TOKEN_TTL }))
      const rotate = vi.fn().mockRejectedValue(new TokenRotationError('upstream 500'))
      const tokenRotationStrategy = buildStrategy(rotate)

      const service = createTokenRotationService(buildConfig(), {
        configProvider,
        tokenRepository,
        tokenRotationStrategy
      })

      await expect(service.rotateAll()).rejects.toBeInstanceOf(AggregateRotationError)
      expect(tokenRepository.clearToken).toHaveBeenCalledWith(ConfigProfileName.STUB)
      expect(tokenRepository.putToken).not.toHaveBeenCalled()
    })
  })

  describe('rotateOne', () => {
    it('rotates with the supplied override config and bypasses SSM', async () => {
      const configProvider = mockConfigProvider()
      const tokenRepository = mockTokenRepository()
      const tokenRotationStrategy = buildStrategy()
      const overrideConfig: Record<string, string> = {
        'client-id': 'override-client',
        'client-secret': 'override-secret', // pragma: allowlist secret
        'endpoint-url': 'https://imposter.test/token',
        'grant-type': 'client_credentials',
        scope: 'accounts'
      }

      const service = createTokenRotationService(buildConfig(), {
        configProvider,
        tokenRepository,
        tokenRotationStrategy
      })

      await service.rotateOne({ overrideConfig, profile: ConfigProfileName.STUB })

      expect(configProvider.getConfig).not.toHaveBeenCalled()
      expect(tokenRotationStrategy.rotate).toHaveBeenCalledWith({ config: overrideConfig })
      expect(tokenRepository.putToken).toHaveBeenCalledWith({
        id: ConfigProfileName.STUB,
        tokenValue: ROTATED_TOKEN,
        ttl: ROTATED_TOKEN_EXPIRES_AT
      })
    })

    it('rejects when the config profile is not enabled', async () => {
      const configProvider = mockConfigProvider()
      const tokenRepository = mockTokenRepository()
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(
        buildConfig({ profiles: [ConfigProfileName.STUB] }),
        { configProvider, tokenRepository, tokenRotationStrategy }
      )

      await expect(
        service.rotateOne({
          overrideConfig: PROVIDER_SSM_CONFIG,
          profile: ConfigProfileName.LIVE
        })
      ).rejects.toBeInstanceOf(TokenRotationError)
      expect(configProvider.getConfig).not.toHaveBeenCalled()
      expect(tokenRotationStrategy.rotate).not.toHaveBeenCalled()
      expect(tokenRepository.putToken).not.toHaveBeenCalled()
    })
  })
})
