import type { Request } from '@middy/core'
import type {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceUpdateEvent,
  Context,
  ScheduledEvent
} from 'aws-lambda'

import { cfnCustomResourceResponse } from '@common/handler/middleware'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

const RESPONSE_URL = 'https://cfn-response.example/put'

const cfnEventBase = {
  LogicalResourceId: 'DeployCheck',
  RequestId: 'req-1',
  ResourceProperties: { ServiceToken: 'arn:aws:lambda:...' },
  ResourceType: 'Custom::LambdaInvoke',
  ResponseURL: RESPONSE_URL,
  ServiceToken: 'arn:aws:lambda:...',
  StackId: 'arn:aws:cloudformation:...'
}

const buildRequest = <TEvent>(
  event: TEvent,
  error: Error | null = null
): Request<TEvent, unknown> => ({
  context: {} as Context,
  error,
  event,
  internal: {},
  response: null
})

const parseBody = (init: RequestInit | undefined): Record<string, unknown> =>
  JSON.parse(init?.body as string) as Record<string, unknown>

let fetchSpy: MockInstance<typeof fetch>

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
})

afterEach(() => {
  fetchSpy.mockRestore()
})

describe('cfnCustomResourceResponse middleware', () => {
  it('PUTs SUCCESS to the response URL on a CFN Create event in the after hook', async () => {
    await cfnCustomResourceResponse().after!(
      buildRequest<CloudFormationCustomResourceCreateEvent>({
        ...cfnEventBase,
        RequestType: 'Create'
      })
    )

    expect(fetchSpy).toHaveBeenCalledWith(RESPONSE_URL, expect.objectContaining({ method: 'PUT' }))
    expect(parseBody(fetchSpy.mock.calls[0]?.[1])).toMatchObject({
      LogicalResourceId: cfnEventBase.LogicalResourceId,
      PhysicalResourceId: `${cfnEventBase.LogicalResourceId}-${cfnEventBase.RequestId}`,
      RequestId: cfnEventBase.RequestId,
      StackId: cfnEventBase.StackId,
      Status: 'SUCCESS'
    })
  })

  it('reuses the incoming PhysicalResourceId for Update events', async () => {
    await cfnCustomResourceResponse().after!(
      buildRequest<CloudFormationCustomResourceUpdateEvent>({
        ...cfnEventBase,
        OldResourceProperties: cfnEventBase.ResourceProperties,
        PhysicalResourceId: 'phys-1',
        RequestType: 'Update'
      })
    )

    expect(parseBody(fetchSpy.mock.calls[0]?.[1])).toMatchObject({
      PhysicalResourceId: 'phys-1'
    })
  })

  it('PUTs FAILED with the error message on onError for a CFN event', async () => {
    const request = buildRequest<CloudFormationCustomResourceCreateEvent>(
      { ...cfnEventBase, RequestType: 'Create' },
      new Error('rotation failed for LIVE')
    )
    await cfnCustomResourceResponse().onError!(request)

    expect(parseBody(fetchSpy.mock.calls[0]?.[1])).toMatchObject({
      Reason: 'rotation failed for LIVE',
      Status: 'FAILED'
    })
    expect(request.response).toBeNull()
  })

  it('does not call fetch for non-CustomResource events on either hook', async () => {
    const middleware = cfnCustomResourceResponse()

    await middleware.after!(buildRequest<ScheduledEvent>({} as ScheduledEvent))
    await middleware.onError!(buildRequest<ScheduledEvent>({} as ScheduledEvent, new Error('boom')))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
