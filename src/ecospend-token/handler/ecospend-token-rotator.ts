import { ecospendTokenRotation } from '@src/ecospend-token/service/ecospend-token-rotation'
import { createTokenRotator } from '@src/third-party-token/handler/token-rotator'
import { loadTokenRotatorConfigFromEnv } from '@src/third-party-token/util/load-config-from-env'

export const handler = createTokenRotator(loadTokenRotatorConfigFromEnv(), {
  tokenRotationStrategy: ecospendTokenRotation
})
