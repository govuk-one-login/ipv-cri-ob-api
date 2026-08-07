import type { ScheduledEvent } from 'aws-lambda'

import { injectLambdaContext } from '@common/handler/middleware'
import { logger } from '@govuk-one-login/cri-logger'
import { logMetrics, metrics } from '@govuk-one-login/cri-metrics'
import { ecospendTokenStrategy } from '@src/ecospend-token/service/ecospend-token-strategy'
import { ssmCredentialsProvider } from '@src/token-rotator/client/ssm-credentials-provider'
import { tokenRepository } from '@src/token-rotator/client/token-repository'
import { createTokenRotator } from '@src/token-rotator/handler/token-rotator'
import { loadTokenRotatorConfigFromEnv } from '@src/token-rotator/util/load-config-from-env'

import middy from '@middy/core'

const tokenRotator = createTokenRotator(loadTokenRotatorConfigFromEnv(), {
  credentialsProvider: ssmCredentialsProvider,
  tokenRepository,
  tokenRotationStrategy: ecospendTokenStrategy
})

export const handler = middy<ScheduledEvent, void>()
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .handler(tokenRotator)
