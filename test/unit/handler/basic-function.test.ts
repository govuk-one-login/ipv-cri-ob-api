import type { APIGatewayProxyEvent, Context } from 'aws-lambda'

import { BasicFunction } from '@src/handler/basic-function'
import { describe, expect, it } from 'vitest'

describe('BasicFunction', () => {
  it('returns 200 with message and path', async () => {
    const lambda = new BasicFunction()
    const result = await lambda.handler(
      { path: '/basic-function' } as APIGatewayProxyEvent,
      {} as Context
    )

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body) as { message: string; path: string }
    expect(body.message).toBe('Hello from the basic function')
    expect(body.path).toBe('/basic-function')
  })
})
