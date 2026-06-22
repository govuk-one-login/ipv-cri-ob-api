import type { ScheduledEvent } from 'aws-lambda'

import { injectLambdaContext } from '@common/handler/middleware'
import { logger } from '@govuk-one-login/cri-logger'
import { logMetrics, metrics } from '@govuk-one-login/cri-metrics'
import { ecospendTokenStrategy } from '@src/ecospend-token/service/ecospend-token-strategy'
import { createTokenRotator } from '@src/token-rotator/handler/token-rotator'

import middy from '@middy/core'

export const handler = middy<ScheduledEvent, void>()
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .handler(createTokenRotator({ tokenRotationStrategy: ecospendTokenStrategy }))
