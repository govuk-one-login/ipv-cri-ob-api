import type { ManualRotateEvent } from '@src/third-party-token/model/rotate-event'
import type { TokenRotationStrategy } from '@src/third-party-token/model/token-rotation-strategy'
import type { TokenRotationServiceConfig } from '@src/third-party-token/service/token-rotation-service'
import type { Context, ScheduledEvent } from 'aws-lambda'

import { createTokenRotator } from '@src/third-party-token/handler/token-rotator'
import { ConfigProfileName } from '@src/third-party-token/model/config-profile'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const { rotateAllMock, rotateOneMock } = vi.hoisted(() => ({
  rotateAllMock: vi.fn(),
  rotateOneMock: vi.fn()
}))

vi.mock('@src/third-party-token/client/token-repository', () => ({
  tokenRepository: {}
}))
vi.mock('@src/third-party-token/client/ssm-config-provider', () => ({
  ssmConfigProvider: {}
}))
vi.mock('@src/third-party-token/service/token-rotation-service', () => ({
  createTokenRotationService: vi.fn(() => ({
    rotateAll: rotateAllMock,
    rotateOne: rotateOneMock
  }))
}))

const BASE_CONFIG: TokenRotationServiceConfig = {
  allowInvocationOverrides: false,
  profiles: [ConfigProfileName.STUB],
  refreshWindowSeconds: 300,
  ssmPathPrefix: '/test/third-party-tokens'
}

const buildContext = (): Context => ({ functionName: 'token-rotator-test' }) as Context

const buildScheduledEvent = (): ScheduledEvent => ({}) as ScheduledEvent

const buildStrategy = (): TokenRotationStrategy<Record<string, string>> => ({
  configSchema: z.record(z.string(), z.string()),
  rotate: vi.fn()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('token-rotator handler', () => {
  it('routes scheduled events to rotateAll', async () => {
    const handler = createTokenRotator(BASE_CONFIG, { tokenRotationStrategy: buildStrategy() })

    await handler(buildScheduledEvent(), buildContext(), () => undefined)

    expect(rotateAllMock).toHaveBeenCalledOnce()
    expect(rotateOneMock).not.toHaveBeenCalled()
  })

  it('routes manual override events to rotateOne when overrides are allowed', async () => {
    const handler = createTokenRotator(
      { ...BASE_CONFIG, allowInvocationOverrides: true },
      { tokenRotationStrategy: buildStrategy() }
    )
    const event: ManualRotateEvent = {
      override: {
        overrideConfig: {
          'client-id': 'qe-override-client',
          'client-secret': 'qe-override-secret' // pragma: allowlist secret
        },
        profile: ConfigProfileName.STUB
      }
    }

    await handler(event, buildContext(), () => undefined)

    expect(rotateOneMock).toHaveBeenCalledWith(event.override)
    expect(rotateAllMock).not.toHaveBeenCalled()
  })

  it('rejects override events when invocation overrides are disabled', async () => {
    const handler = createTokenRotator(BASE_CONFIG, { tokenRotationStrategy: buildStrategy() })
    const event: ManualRotateEvent = {
      override: { overrideConfig: {}, profile: ConfigProfileName.STUB }
    }

    await expect(handler(event, buildContext(), () => undefined)).rejects.toThrow(/disabled/i)
    expect(rotateAllMock).not.toHaveBeenCalled()
    expect(rotateOneMock).not.toHaveBeenCalled()
  })
})
