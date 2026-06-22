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

interface TokenRotatorCollaborators<TConfig> {
  tokenRotationStrategy: TokenRotationStrategy<TConfig>
}

export const createTokenRotator = <TConfig>(
  config: TokenRotationServiceConfig,
  collaborators: TokenRotatorCollaborators<TConfig>
): Handler<RotateEvent, void> => {
  const tokenRotationService = createTokenRotationService<TConfig>(config, {
    configProvider: ssmConfigProvider,
    tokenRepository,
    tokenRotationStrategy: collaborators.tokenRotationStrategy
  })

  return middy<RotateEvent, void>()
    .use(injectLambdaContext(logger, { resetKeys: true }))
    .use(logMetrics(metrics, { captureColdStartMetric: true }))
    .handler(async (event) => {
      if ('override' in event) {
        if (!config.allowInvocationOverrides) {
          throw new Error('Invocation overrides are disabled in this environment')
        }
        await tokenRotationService.rotateOne(event.override)
        return
      }
      await tokenRotationService.rotateAll()
    })
}
