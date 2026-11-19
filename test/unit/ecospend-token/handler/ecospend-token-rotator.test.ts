import type * as CfnCustomResourceModule from '@common/util/cfn-custom-resource'
import type { TokenRotationService } from '@govuk-one-login/cri-token-rotator'
import type { Context, ScheduledEvent } from 'aws-lambda'

import { handler } from '@src/ecospend-token/handler/ecospend-token-rotator'
import { buildCfnCustomResourceEvent } from '@test-fixtures/aws/cfn-custom-resource-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { middlewareOrder } = await vi.hoisted(
  () => import('@test-fixtures/middy/handler-middleware')
)

const { rotateAll } = vi.hoisted(() => {
  return { rotateAll: vi.fn<TokenRotationService['rotateAll']>() }
})

vi.mock('@common/util/cfn-custom-resource', async (importOriginal) => ({
  ...(await importOriginal<typeof CfnCustomResourceModule>()),
  putCustomResourceResponse: vi.fn()
}))

vi.mock('@govuk-one-login/cri-token-rotator/dynamodb', () => ({
  createDynamoTokenRepository: () => ({ getToken: vi.fn(), putToken: vi.fn() })
}))

vi.mock('@govuk-one-login/cri-token-rotator', () => ({
  createTokenRotationService: () => ({ rotateAll })
}))

const buildContext = (): Context => ({ functionName: 'ecospend-token-rotator-test' }) as Context

const buildScheduledEvent = (): ScheduledEvent => ({}) as ScheduledEvent

describe('ecospend-token-rotator handler', () => {
  beforeEach(() => {
    rotateAll.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('registers the middleware chain in order', () => {
    expect(middlewareOrder).toEqual([
      'latencyRecorder',
      'resultRecorder',
      'injectLambdaContext',
      'logMetrics',
      'cfnCustomResourceEventResponder'
    ])
  })

  it('calls rotateAll without force for a scheduled event', async () => {
    await handler(buildScheduledEvent(), buildContext())

    expect(rotateAll).toHaveBeenCalledExactlyOnceWith()
  })

  it('calls rotateAll with force for a CloudFormation Create event', async () => {
    await handler(buildCfnCustomResourceEvent('Create'), buildContext())

    expect(rotateAll).toHaveBeenCalledExactlyOnceWith({ force: true })
  })

  it('calls rotateAll with force for a CloudFormation Update event', async () => {
    await handler(buildCfnCustomResourceEvent('Update'), buildContext())

    expect(rotateAll).toHaveBeenCalledExactlyOnceWith({ force: true })
  })

  it('does nothing on a CloudFormation Delete event', async () => {
    await handler(buildCfnCustomResourceEvent('Delete'), buildContext())

    expect(rotateAll).not.toHaveBeenCalled()
  })

  it('rethrows when a rotation fails', async () => {
    rotateAll.mockRejectedValue(new Error('Token rotation failed'))

    await expect(handler(buildScheduledEvent(), buildContext())).rejects.toThrow(
      'Token rotation failed'
    )
  })
})
