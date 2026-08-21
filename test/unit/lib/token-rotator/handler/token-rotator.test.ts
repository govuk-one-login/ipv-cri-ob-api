import type { DynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import type { CredentialsProvider } from '@lib/token-rotator/client/ssm-credentials-provider'
import type { TokenRotationStrategy } from '@lib/token-rotator/model/token-rotation-strategy'
import type { TokenRotationServiceConfig } from '@lib/token-rotator/service/token-rotation-service'
import type { ScheduledEvent } from 'aws-lambda'

import { createTokenRotator } from '@lib/token-rotator/handler/token-rotator'
import { TokenProfile } from '@lib/token-rotator/model/token-profile'
import { describe, expect, it, vi } from 'vitest'

const buildConfig = (): TokenRotationServiceConfig => ({
  credentialsPathPrefix: '/test/tokens',
  profiles: [TokenProfile.STUB],
  refreshWindowSeconds: 300
})

const buildCredentialsProvider = (): CredentialsProvider => ({
  getCredentials: vi.fn().mockResolvedValue({ 'client-id': 'test' })
})

const buildTokenRepository = (): DynamoTokenRepository => ({
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
