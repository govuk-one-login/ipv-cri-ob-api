import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'

import { getTokenProfileForClientID } from '@common/model/oauth-client-id'
import { logger } from '@govuk-one-login/cri-logger'
import { captureMetric, metrics, MetricUnit } from '@govuk-one-login/cri-metrics'
import { tokenRetrievalService } from '@src/token-rotator/service/token-retrieval-service'

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

  private async process(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const profile = getTokenProfileForClientID('ipv-core-stub') // from session normally
    const tokenValue = await tokenRetrievalService.retrieveToken(profile)

    if (!tokenValue) {
      logger.error('Unable to retrieve third-party token', { profile })
      return {
        body: JSON.stringify({
          oauth_error: {
            error: 'server_error',
            error_description: 'Unexpected server error'
          }
        }),
        statusCode: 500
      }
    }

    logger.info('Third-party token retrieved', { profile })
    return {
      body: JSON.stringify({
        message: 'Hello from the basic function',
        path: event.path
      }),
      statusCode: 200
    }
  }
}

const handlerClass = new BasicFunction()
export const lambdaHandler = handlerClass.handler.bind(handlerClass)
