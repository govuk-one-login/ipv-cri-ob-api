import type { CredentialsProvider } from '@src/token-rotator/client/ssm-credentials-provider'
import type { TokenRepository } from '@src/token-rotator/client/token-repository'
import type { TokenRotationStrategy } from '@src/token-rotator/model/token-rotation-strategy'
import type { TokenRotationServiceConfig } from '@src/token-rotator/service/token-rotation-service'
import type {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceUpdateEvent,
  ScheduledEvent
} from 'aws-lambda'

import { createTokenRotator } from '@src/token-rotator/handler/token-rotator'
import { TokenProfile } from '@src/token-rotator/model/token-profile'
import { describe, expect, it, vi } from 'vitest'

const NOW_SECONDS = Math.floor(Date.now() / 1000)
const FRESH_TOKEN_TTL = NOW_SECONDS + 3600

const buildConfig = (
  overrides: Partial<TokenRotationServiceConfig> = {}
): TokenRotationServiceConfig => ({
  credentialsPathPrefix: '/test/third-party-tokens',
  profiles: [TokenProfile.STUB],
  refreshWindowSeconds: 300,
  ...overrides
})

const buildCredentialsProvider = (): CredentialsProvider => ({
  getCredentials: vi.fn().mockResolvedValue({ 'client-id': 'test' })
})

const buildTokenRepository = (): TokenRepository => ({
  getToken: vi.fn().mockResolvedValue(undefined),
  putToken: vi.fn().mockResolvedValue(undefined)
})

const buildStrategy = (): TokenRotationStrategy => ({
  rotate: vi.fn().mockResolvedValue({
    expiresAtSeconds: FRESH_TOKEN_TTL,
    tokenValue: 'fresh-token'
  })
})

const cfnEventBase = {
  LogicalResourceId: 'MyTokenRotatorDeployCheck',
  RequestId: 'req-1',
  ResourceProperties: { ServiceToken: 'arn:aws:lambda:eu-west-2:123:function:x' },
  ResourceType: 'Custom::MyTokenRotate',
  ResponseURL: 'https://cfn-response.example/put',
  ServiceToken: 'arn:aws:lambda:eu-west-2:123:function:x',
  StackId: 'arn:aws:cloudformation:eu-west-2:123:stack/x/y'
}

describe('token-rotator handler', () => {
  it('rotates all configured profiles when invoked by a scheduled event', async () => {
    const tokenRepository = buildTokenRepository()
    const tokenRotationStrategy = buildStrategy()

    const handler = createTokenRotator(
      buildConfig({
        profiles: [TokenProfile.STUB, TokenProfile.UAT]
      }),
      {
        credentialsProvider: buildCredentialsProvider(),
        tokenRepository,
        tokenRotationStrategy
      }
    )

    await handler({} as ScheduledEvent)

    expect(tokenRotationStrategy.rotate).toHaveBeenCalledTimes(2)
    expect(tokenRepository.putToken).toHaveBeenCalledTimes(2)
  })

  it('force-rotates on CustomResource Create event', async () => {
    const tokenRepository = buildTokenRepository()
    tokenRepository.getToken = vi.fn().mockResolvedValue({
      id: TokenProfile.STUB,
      tokenValue: 'still-fresh',
      ttl: FRESH_TOKEN_TTL
    })
    const tokenRotationStrategy = buildStrategy()

    const handler = createTokenRotator(buildConfig(), {
      credentialsProvider: buildCredentialsProvider(),
      tokenRepository,
      tokenRotationStrategy
    })

    await handler({
      ...cfnEventBase,
      RequestType: 'Create'
    } as CloudFormationCustomResourceCreateEvent)

    expect(tokenRepository.getToken).not.toHaveBeenCalled()
    expect(tokenRotationStrategy.rotate).toHaveBeenCalledOnce()
    expect(tokenRepository.putToken).toHaveBeenCalledOnce()
  })

  it('force-rotates on a CustomResource Update event', async () => {
    const tokenRepository = buildTokenRepository()
    const tokenRotationStrategy = buildStrategy()

    const handler = createTokenRotator(buildConfig(), {
      credentialsProvider: buildCredentialsProvider(),
      tokenRepository,
      tokenRotationStrategy
    })

    await handler({
      ...cfnEventBase,
      OldResourceProperties: cfnEventBase.ResourceProperties,
      PhysicalResourceId: 'phys-1',
      RequestType: 'Update'
    } as CloudFormationCustomResourceUpdateEvent)

    expect(tokenRotationStrategy.rotate).toHaveBeenCalledOnce()
    expect(tokenRepository.putToken).toHaveBeenCalledOnce()
  })

  it('short-circuits on a CFN Delete event', async () => {
    const tokenRepository = buildTokenRepository()
    const tokenRotationStrategy = buildStrategy()
    const credentialsProvider = buildCredentialsProvider()

    const handler = createTokenRotator(buildConfig(), {
      credentialsProvider,
      tokenRepository,
      tokenRotationStrategy
    })

    await handler({
      ...cfnEventBase,
      PhysicalResourceId: 'phys-1',
      RequestType: 'Delete'
    } as CloudFormationCustomResourceDeleteEvent)

    expect(credentialsProvider.getCredentials).not.toHaveBeenCalled()
    expect(tokenRotationStrategy.rotate).not.toHaveBeenCalled()
    expect(tokenRepository.putToken).not.toHaveBeenCalled()
  })
})
