import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { injectLambdaContext } from '@common/handler/middleware'
import { logger } from '@govuk-one-login/cri-logger'
import { logMetrics, metrics } from '@govuk-one-login/cri-metrics'
import {
  ClientIDToConfigProfileMapping,
  OAuthClientID
} from '@src/third-party-token/model/config-profile'
import { tokenRetrievalService } from '@src/third-party-token/service/token-retrieval-service'

import middy from '@middy/core'

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Lambda invoked')

  const clientID: OAuthClientID = OAuthClientID.IPV_CORE
  const profile = ClientIDToConfigProfileMapping[clientID]
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
      message: 'Successfully executed',
      path: event.path
    }),
    statusCode: 200
  }
}

export const handler = middy<APIGatewayProxyEvent, APIGatewayProxyResult>()
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .handler(lambdaHandler)
