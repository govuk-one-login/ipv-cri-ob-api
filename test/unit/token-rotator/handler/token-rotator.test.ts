import type { OverrideRotateEvent } from '@src/token-rotator/model/rotate-event'
import type { TokenRotationStrategy } from '@src/token-rotator/model/token-rotation-strategy'
import type { Context, ScheduledEvent } from 'aws-lambda'

import { createTokenRotator } from '@src/token-rotator/handler/token-rotator'
import { TokenProfile } from '@src/token-rotator/model/token-profile'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rotateAllMock, rotateOneMock } = vi.hoisted(() => ({
  rotateAllMock: vi.fn(),
  rotateOneMock: vi.fn()
}))

vi.mock('@src/token-rotator/client/token-repository', () => ({
  tokenRepository: {}
}))
vi.mock('@src/token-rotator/client/ssm-config-provider', () => ({
  ssmConfigProvider: {}
}))
vi.mock('@src/token-rotator/util/load-config-from-env', () => ({
  loadTokenRotatorConfigFromEnv: vi.fn(() => ({
    configPathPrefix: '/test/third-party-tokens',
    profiles: [TokenProfile.STUB],
    refreshWindowSeconds: 300
  }))
}))
vi.mock('@src/token-rotator/service/token-rotation-service', () => ({
  createTokenRotationService: vi.fn(() => ({
    rotateAll: rotateAllMock,
    rotateOne: rotateOneMock
  }))
}))

const buildContext = (): Context => ({ functionName: 'token-rotator-test' }) as Context

const buildScheduledEvent = (): ScheduledEvent => ({}) as ScheduledEvent

const buildStrategy = (): TokenRotationStrategy => ({
  rotate: vi.fn()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('token-rotator handler', () => {
  it('routes scheduled events to rotateAll', async () => {
    const handler = createTokenRotator({ tokenRotationStrategy: buildStrategy() })

    await handler(buildScheduledEvent(), buildContext(), () => undefined)

    expect(rotateAllMock).toHaveBeenCalledOnce()
    expect(rotateOneMock).not.toHaveBeenCalled()
  })

  it('routes override events to rotateOne', async () => {
    const handler = createTokenRotator({ tokenRotationStrategy: buildStrategy() })
    const event: OverrideRotateEvent = {
      override: {
        credentials: {
          'client-id': 'qe-override-client',
          'client-secret': 'qe-override-secret' // pragma: allowlist secret
        },
        profile: TokenProfile.STUB
      }
    }

    await handler(event, buildContext(), () => undefined)

    expect(rotateOneMock).toHaveBeenCalledWith(event.override)
    expect(rotateAllMock).not.toHaveBeenCalled()
  })
})
