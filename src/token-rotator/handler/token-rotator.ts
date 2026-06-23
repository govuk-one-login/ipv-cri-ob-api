import type { RotateEvent } from '@src/token-rotator/model/rotate-event'
import type { TokenRotationStrategy } from '@src/token-rotator/model/token-rotation-strategy'
import type { Handler } from 'aws-lambda'

import { injectLambdaContext } from '@common/handler/middleware'
import { logger } from '@govuk-one-login/cri-logger'
import { logMetrics, metrics } from '@govuk-one-login/cri-metrics'
import { ssmConfigProvider } from '@src/token-rotator/client/ssm-config-provider'
import { tokenRepository } from '@src/token-rotator/client/token-repository'
import { createTokenRotationService } from '@src/token-rotator/service/token-rotation-service'
import { loadTokenRotatorConfigFromEnv } from '@src/token-rotator/util/load-config-from-env'

import middy from '@middy/core'

interface TokenRotatorCollaborators {
  tokenRotationStrategy: TokenRotationStrategy
}

/**
 * any `ScheduledEvent` triggers `rotateAll`, which iterates the configured profiles, fetches each
 * profile's credentials from the configured `ConfigProvider`, skips any token still inside the
 * refresh window, and writes a fresh token via the plugin's `TokenRotationStrategy`
 *
 * an `OverrideRotateEvent` (`{ override: { profile, credentials } }`) bypasses the config
 * provider and the freshness check, rotating the single named profile using the supplied
 * credentials
 *
 * see {@link OverrideRotateEvent} for the payload shape
 */
export const createTokenRotator = (
  collaborators: TokenRotatorCollaborators
): Handler<RotateEvent, void> => {
  const tokenRotationService = createTokenRotationService(loadTokenRotatorConfigFromEnv(), {
    configProvider: ssmConfigProvider,
    tokenRepository,
    tokenRotationStrategy: collaborators.tokenRotationStrategy
  })

  return middy<RotateEvent, void>()
    .use(injectLambdaContext(logger, { resetKeys: true }))
    .use(logMetrics(metrics, { captureColdStartMetric: true }))
    .handler(async (event) => {
      if ('override' in event) {
        await tokenRotationService.rotateOne(event.override)
        return
      }
      await tokenRotationService.rotateAll()
    })
}
