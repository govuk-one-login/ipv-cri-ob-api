import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { errorHandler, injectLambdaContext, logMetrics } from '@common/handler/middleware'
import { getTokenProfileForClientId } from '@common/model/oauth-client-id'
import { logger } from '@govuk-one-login/cri-logger'
import { metrics } from '@govuk-one-login/cri-metrics'
import { tokenRetrievalService } from '@lib/token-rotator/service/token-retrieval-service'

import middy from '@middy/core'

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Lambda invoked')

  const profile = getTokenProfileForClientId('ipv-core-stub') // example id that maps to STUB, from session normally
  const tokenValue = await tokenRetrievalService.retrieveToken(profile)

  if (!tokenValue) {
    logger.error('Unable to retrieve access token', { profile })
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

  logger.info('Access token retrieved', { profile })

  return {
    body: JSON.stringify({
      message: 'Success',
      path: event.path
    }),
    statusCode: 200
  }
}

export const handler = middy<APIGatewayProxyEvent, APIGatewayProxyResult>()
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(errorHandler())
  .handler(lambdaHandler)
