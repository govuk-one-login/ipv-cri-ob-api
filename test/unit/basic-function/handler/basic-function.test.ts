import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@common/handler/middleware', () => ({
  errorHandler: () => ({ after: vi.fn(), before: vi.fn(), onError: vi.fn() }),
  httpHeaderNormalizer: () => ({ after: vi.fn(), before: vi.fn() }),
  injectLambdaContext: () => ({ after: vi.fn(), before: vi.fn() }),
  latencyRecorder: () => ({ after: vi.fn(), before: vi.fn() }),
  logMetrics: () => ({ after: vi.fn(), before: vi.fn() }),
  resultRecorder: () => ({ after: vi.fn(), before: vi.fn() })
}))

vi.mock('@govuk-one-login/cri-logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() }
}))

vi.mock('@govuk-one-login/cri-metrics', () => ({
  logMetrics: () => ({ after: vi.fn(), before: vi.fn() }),
  metrics: {}
}))

vi.mock('@middy/core', () => ({
  default: () => ({
    handler: vi.fn().mockImplementation((fn: unknown) => fn),
    use: vi.fn().mockReturnThis()
  })
}))

import { handler } from '@src/basic-function/handler/basic-function'

const buildEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent =>
  ({ path: '/basic-function', ...overrides }) as APIGatewayProxyEvent

const invokeHandler = (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> =>
  (handler as unknown as (e: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>)(event)

describe('basic-function handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 200 with message and path', async () => {
    const result = await invokeHandler(buildEvent())

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual({
      message: 'Hello from the basic function',
      path: '/basic-function'
    })
  })
})
