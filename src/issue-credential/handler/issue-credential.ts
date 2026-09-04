import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { getIdentityScoreRepository } from '@common/client/identity-score-repository'
import { getPersonIdentityRepository } from '@common/client/person-identity-repository'
import { getSessionRepository } from '@common/client/session-repository'
import {
  errorHandler,
  httpHeaderNormalizer,
  injectLambdaContext,
  latencyRecorder,
  logMetrics,
  resultRecorder
} from '@common/handler/middleware'
import { auditEventPublisher } from '@common/service/audit-event-publisher'
import { requireBearerToken } from '@common/util/headers'
import { logger } from '@govuk-one-login/cri-logger'
import { metrics } from '@govuk-one-login/cri-metrics'
import { createIssueCredentialService } from '@src/issue-credential/service/issue-credential-service'
import { jwtEnvelopeGenerator } from '@src/issue-credential/service/jwt-envelope-generator'
import { verifiableCredentialBuilder } from '@src/issue-credential/service/verifiable-credential-builder'
import { verifiableCredentialSigner } from '@src/issue-credential/service/verifiable-credential-signer'

import middy from '@middy/core'

const issueCredentialService = createIssueCredentialService({
  auditEventPublisher,
  identityScoreRepository: getIdentityScoreRepository(),
  jwtEnvelopeGenerator,
  personDetailsRepository: getPersonIdentityRepository(),
  sessionRepository: getSessionRepository(),
  verifiableCredentialBuilder,
  verifiableCredentialSigner
})

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Lambda invoked')
  const accessToken = requireBearerToken(event.headers?.['authorization'])
  const { credential } = await issueCredentialService({ accessToken })
  return {
    body: credential,
    headers: { 'Content-Type': 'application/jwt' },
    statusCode: 200
  }
}

export const handler = middy<APIGatewayProxyEvent, APIGatewayProxyResult>()
  .use(latencyRecorder()) // latencyRecorder is first
  .use(resultRecorder())
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(httpHeaderNormalizer())
  .use(errorHandler()) // errorHandler is last
  .handler(lambdaHandler)
