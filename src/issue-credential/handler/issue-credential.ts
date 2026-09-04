import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { latencyRecorder, resultRecorder } from '@common/handler/middleware/recorders'
import { errorResponder } from '@common/handler/middleware/responders'
import { auditEventPublisher } from '@common/service/audit-event-publisher'
import { requireBearerToken } from '@common/util/headers'
import { injectLambdaContext, logger } from '@govuk-one-login/cri-logger'
import { logMetrics, metrics } from '@govuk-one-login/cri-metrics'
import { sessionRepository } from '@src/common/client/session-repository'
import { identityScoreRepository } from '@src/issue-credential/client/identity-score-repository'
import { personDetailsRepository } from '@src/issue-credential/client/person-details-repository'
import { createIssueCredentialService } from '@src/issue-credential/service/issue-credential-service'
import { jwtEnvelopeGenerator } from '@src/issue-credential/service/jwt-envelope-generator'
import { verifiableCredentialBuilder } from '@src/issue-credential/service/verifiable-credential-builder'
import { verifiableCredentialSigner } from '@src/issue-credential/service/verifiable-credential-signer'

import middy from '@middy/core'
import httpHeaderNormalizer from '@middy/http-header-normalizer'

const issueCredentialService = createIssueCredentialService({
  auditEventPublisher,
  identityScoreRepository,
  jwtEnvelopeGenerator,
  personDetailsRepository,
  sessionRepository,
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
  .use(errorResponder()) // errorResponder is always last
  .handler(lambdaHandler)
