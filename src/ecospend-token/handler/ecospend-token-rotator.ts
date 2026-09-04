import type { CloudFormationCustomResourceEvent, ScheduledEvent } from 'aws-lambda'

import { cfnCustomResourceEventResponder } from '@common/handler/middleware/responders'
import { isCfnCustomResourceEvent } from '@common/util/cfn-custom-resource'
import { injectLambdaContext, logger } from '@govuk-one-login/cri-logger'
import { logMetrics, metrics } from '@govuk-one-login/cri-metrics'
import { getDynamoTokenRepository } from '@lib/token-rotator/client/dynamo-token-repository'
import { ssmCredentialsProvider } from '@lib/token-rotator/client/ssm-credentials-provider'
import { createTokenRotationService } from '@lib/token-rotator/service/token-rotation-service'
import { loadTokenRotatorConfigFromEnv } from '@lib/token-rotator/util/load-config-from-env'
import { ecospendTokenStrategy } from '@src/ecospend-token/service/ecospend-token-strategy'

import middy from '@middy/core'

type EcospendTokenRotatorEvent = CloudFormationCustomResourceEvent | ScheduledEvent

const tokenRotationService = createTokenRotationService(loadTokenRotatorConfigFromEnv(), {
  credentialsProvider: ssmCredentialsProvider,
  tokenRepository: getDynamoTokenRepository(),
  tokenRotationStrategy: ecospendTokenStrategy
})

const tokenRotator = async (event: EcospendTokenRotatorEvent): Promise<void> => {
  if (isCfnCustomResourceEvent(event)) {
    if (event.RequestType === 'Delete') return
    await tokenRotationService.rotateAll({ force: true })
    return
  }
  await tokenRotationService.rotateAll()
}

export const handler = middy<EcospendTokenRotatorEvent, void>()
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(cfnCustomResourceEventResponder())
  .handler(tokenRotator)
