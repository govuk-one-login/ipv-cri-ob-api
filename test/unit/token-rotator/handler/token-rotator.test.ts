import type { TokenRotationStrategy } from '@src/token-rotator/model/token-rotation-strategy'
import type { ScheduledEvent } from 'aws-lambda'

import { createTokenRotator } from '@src/token-rotator/handler/token-rotator'
import { TokenProfile } from '@src/token-rotator/model/token-profile'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rotateAllMock } = vi.hoisted(() => ({
  rotateAllMock: vi.fn()
}))

vi.mock('@src/token-rotator/client/token-repository', () => ({
  tokenRepository: {}
}))
vi.mock('@src/token-rotator/client/ssm-credentials-provider', () => ({
  ssmCredentialsProvider: {}
}))
vi.mock('@src/token-rotator/util/load-config-from-env', () => ({
  loadTokenRotatorConfigFromEnv: vi.fn(() => ({
    credentialsPathPrefix: '/test/third-party-tokens',
    profiles: [TokenProfile.STUB],
    refreshWindowSeconds: 300
  }))
}))
vi.mock('@src/token-rotator/service/token-rotation-service', () => ({
  createTokenRotationService: vi.fn(() => ({
    rotateAll: rotateAllMock
  }))
}))

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

    await handler(buildScheduledEvent())

    expect(rotateAllMock).toHaveBeenCalledOnce()
  })
})
