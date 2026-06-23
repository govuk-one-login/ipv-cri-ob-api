import type { RotateEvent } from '@src/third-party-token/model/rotate-event'
import type { TokenRotationStrategy } from '@src/third-party-token/model/token-rotation-strategy'
import type { Handler } from 'aws-lambda'

import { injectLambdaContext } from '@common/handler/middleware'
import { logger } from '@govuk-one-login/cri-logger'
import { logMetrics, metrics } from '@govuk-one-login/cri-metrics'
import { ssmConfigProvider } from '@src/third-party-token/client/ssm-config-provider'
import { tokenRepository } from '@src/third-party-token/client/token-repository'
import {
  createTokenRotationService,
  type TokenRotationServiceConfig
} from '@src/third-party-token/service/token-rotation-service'

import middy from '@middy/core'

interface TokenRotatorCollaborators<TRequest> {
  tokenRotationStrategy: TokenRotationStrategy<TRequest>
}

/**
 * any `ScheduledEvent` triggers `rotateAll`, which iterates the configured profiles, fetches each
 * profile's config from SSM, skips any token still inside the refresh window, and writes a fresh
 * token via the plugin's `TokenRotationStrategy`.
 *
 * a `ManualRotateEvent` (`{ override: { profile, overrideRequest } }`) bypasses SSM and the
 * freshness check, rotating the single named profile using the supplied override config
 *
 * see {@link ManualRotateEvent} for the payload shape
 */
export const createTokenRotator = <TRequest>(
  config: TokenRotationServiceConfig,
  collaborators: TokenRotatorCollaborators<TRequest>
): Handler<RotateEvent, void> => {
  const tokenRotationService = createTokenRotationService<TRequest>(config, {
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
