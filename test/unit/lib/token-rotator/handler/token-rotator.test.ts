import type { CredentialsProvider } from '@lib/token-rotator/model/credentials-provider'
import type { TokenRepository } from '@lib/token-rotator/model/token-repository'
import type { TokenRotationStrategy } from '@lib/token-rotator/model/token-rotation-strategy'
import type { TokenRotationServiceConfig } from '@lib/token-rotator/service/token-rotation-service'
import type { ScheduledEvent } from 'aws-lambda'

import { createTokenRotator } from '@lib/token-rotator/handler/token-rotator'
import { describe, expect, it, vi } from 'vitest'

type TestProfile = 'ALPHA' | 'BETA'

const buildConfig = (): TokenRotationServiceConfig<TestProfile> => ({
  profiles: ['ALPHA'],
  refreshWindowSeconds: 300
})

const buildCredentialsProvider = (): CredentialsProvider<TestProfile> => ({
  getCredentials: vi.fn().mockResolvedValue({ 'client-id': 'test' })
})

const buildTokenRepository = (): TokenRepository => ({
  getToken: vi.fn().mockResolvedValue(undefined),
  putToken: vi.fn().mockResolvedValue(undefined)
})

const buildStrategy = (): TokenRotationStrategy => ({
  rotate: vi.fn().mockResolvedValue({
    expiresAtSeconds: Math.floor(Date.now() / 1000) + 3600,
    tokenValue: 'fresh-token'
  })
})

describe('token-rotator handler', () => {
  it('rotates all configured profiles when invoked', async () => {
    const tokenRepository = buildTokenRepository()
    const tokenRotationStrategy = buildStrategy()

    const handler = createTokenRotator(buildConfig(), {
      credentialsProvider: buildCredentialsProvider(),
      tokenRepository,
      tokenRotationStrategy
    })

    await handler({} as ScheduledEvent)

    expect(tokenRotationStrategy.rotate).toHaveBeenCalledOnce()
    expect(tokenRepository.putToken).toHaveBeenCalledOnce()
  })
})
