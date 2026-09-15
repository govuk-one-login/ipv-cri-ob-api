import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { TokenRotationServiceConfig } from '@lib/token-rotator/service/token-rotation-service'

import { requireEnv } from '@common/util/env'
import { parseProfiles } from '@common/util/parse-profiles'
import { parseRefreshWindowSeconds } from '@lib/token-rotator/util/parse-refresh-window'

export const loadTokenRotatorConfigFromEnv = (): TokenRotationServiceConfig<EndpointProfile> => ({
  profiles: parseProfiles(requireEnv('ENDPOINT_PROFILES')),
  refreshWindowSeconds: parseRefreshWindowSeconds(
    requireEnv('TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS')
  )
})
