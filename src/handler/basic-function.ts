import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'

import { logger } from '@govuk-one-login/cri-logger'
import { captureMetric, metrics, MetricUnit } from '@govuk-one-login/cri-metrics'

export class BasicFunction {
  @metrics.logMetrics({
    captureColdStartMetric: true
  })
  public async handler(
    event: APIGatewayProxyEvent,
    _context: Context
  ): Promise<APIGatewayProxyResult> {
    logger.info('Lambda invoked')
    captureMetric('INVOKE_COUNT', 1, MetricUnit.Count)
    return this.process(event)
  }

  private process(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return Promise.resolve({
      body: JSON.stringify({
        message: 'Hello from the basic function',
        path: event.path
      }),
      statusCode: 200
    })
  }
}

const handlerClass = new BasicFunction()
export const lambdaHandler = handlerClass.handler.bind(handlerClass)
