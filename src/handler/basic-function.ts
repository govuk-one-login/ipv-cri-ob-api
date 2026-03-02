import type { LambdaInterface } from '@aws-lambda-powertools/commons/types'
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'

import { Logger } from '@aws-lambda-powertools/logger'

export const logger = new Logger()

export class BasicFunction implements LambdaInterface {
  public handler(_event: APIGatewayProxyEvent, _context: Context): APIGatewayProxyResult {
    logger.info('Basic Lambda invoked')
    return {
      body: JSON.stringify({
        message: 'Basic Open Banking CRI API'
      }),
      statusCode: 200
    }
  }
}

const handlerClass = new BasicFunction()
export const lambdaHandler = handlerClass.handler.bind(handlerClass)
