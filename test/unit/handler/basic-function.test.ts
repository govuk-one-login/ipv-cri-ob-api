import type { APIGatewayProxyEvent, Context } from 'aws-lambda'

import { BasicFunction } from '@src/handler/basic-function'
import { describe, expect, it } from 'vitest'

describe('BasicFunction', () => {
  it('returns 200 with message', () => {
    const lambda = new BasicFunction()
    const result = lambda.handler({} as APIGatewayProxyEvent, {} as Context)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body) as { message: string }
    expect(body.message).toBe('Basic Open Banking CRI API')
  })
})
