import type { ConfigProvider } from '@src/token-rotator/client/ssm-config-provider'
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
const ROTATED_TOKEN_EXPIRES_AT = 1_800_000_000

const buildConfig = (
  overrides: Partial<TokenRotationServiceConfig> = {}
): TokenRotationServiceConfig => ({
  configPathPrefix: '/test/third-party-tokens',
  profiles: [TokenProfile.STUB],
  refreshWindowSeconds: 300,
  ...overrides
})

const buildStrategy = (
  rotate: TokenRotationStrategy['rotate'] = vi.fn().mockResolvedValue({
    expiresAtSeconds: ROTATED_TOKEN_EXPIRES_AT,
    tokenValue: ROTATED_TOKEN
  })
): TokenRotationStrategy => ({ rotate })

const buildTokenEntity = (overrides: Partial<TokenEntity> = {}): TokenEntity => ({
  id: TokenProfile.STUB,
  tokenValue: 'cached-token',
  ttl: FRESH_TOKEN_TTL,
  ...overrides
})

const mockConfigProvider = (): ConfigProvider => ({
  getConfig: vi.fn().mockResolvedValue(PROVIDER_CREDENTIALS)
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
    it('writes a fresh token for each enabled profile when none is cached', async () => {
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
      expect(tokenRotationStrategy.rotate).toHaveBeenCalledWith(PROVIDER_CREDENTIALS)
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
        buildConfig({ profiles: [TokenProfile.STUB, TokenProfile.UAT] }),
        { configProvider, tokenRepository, tokenRotationStrategy }
      )

      await expect(service.rotateAll()).rejects.toMatchObject({
        failures: [{ profile: TokenProfile.UAT, reason: 'upstream 500' }],
        name: 'AggregateRotationError'
      })
      expect(tokenRepository.putToken).toHaveBeenCalledTimes(1)
      expect(tokenRepository.putToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: TokenProfile.STUB })
      )
    })
  })

  describe('rotateOne', () => {
    it('rotates with the supplied credentials and bypasses the config provider', async () => {
      const configProvider = mockConfigProvider()
      const tokenRepository = mockTokenRepository()
      const tokenRotationStrategy = buildStrategy()
      const credentials: ProviderCredentials = {
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

      await service.rotateOne({ credentials, profile: TokenProfile.STUB })

      expect(configProvider.getConfig).not.toHaveBeenCalled()
      expect(tokenRotationStrategy.rotate).toHaveBeenCalledWith(credentials)
      expect(tokenRepository.putToken).toHaveBeenCalledWith({
        id: TokenProfile.STUB,
        tokenValue: ROTATED_TOKEN,
        ttl: ROTATED_TOKEN_EXPIRES_AT
      })
    })

    it('rejects when the profile is not enabled', async () => {
      const configProvider = mockConfigProvider()
      const tokenRepository = mockTokenRepository()
      const tokenRotationStrategy = buildStrategy()

      const service = createTokenRotationService(buildConfig({ profiles: [TokenProfile.STUB] }), {
        configProvider,
        tokenRepository,
        tokenRotationStrategy
      })

      await expect(
        service.rotateOne({
          credentials: PROVIDER_CREDENTIALS,
          profile: TokenProfile.LIVE
        })
      ).rejects.toBeInstanceOf(TokenRotationError)
      expect(configProvider.getConfig).not.toHaveBeenCalled()
      expect(tokenRotationStrategy.rotate).not.toHaveBeenCalled()
      expect(tokenRepository.putToken).not.toHaveBeenCalled()
    })
  })
})
