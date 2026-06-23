import type { TokenRotationServiceConfig } from '@src/third-party-token/service/token-rotation-service'

import { requireEnv } from '@common/util/env'
import { ConfigProfileName } from '@src/third-party-token/model/config-profile'

const KNOWN_PROFILES = Object.values(ConfigProfileName) as ConfigProfileName[]

const parseProfiles = (raw: string): ConfigProfileName[] => {
  const profiles = raw
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
  if (profiles.length === 0) {
    throw new Error('THIRD_PARTY_TOKEN_PROFILES must contain at least one profile')
  }
  const invalid = profiles.filter((p) => !KNOWN_PROFILES.includes(p as ConfigProfileName))
  if (invalid.length > 0) throw new Error(`Unknown profile(s): ${invalid.join(', ')}`)
  return profiles as ConfigProfileName[]
}

const parseRefreshWindow = (raw: string): number => {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `THIRD_PARTY_TOKEN_REFRESH_WINDOW_SECONDS must be a positive number, got "${raw}"`
    )
  }
  return value
}

export const loadTokenRotatorConfigFromEnv = (): TokenRotationServiceConfig => ({
  profiles: parseProfiles(requireEnv('THIRD_PARTY_TOKEN_PROFILES')),
  refreshWindowSeconds: parseRefreshWindow(requireEnv('THIRD_PARTY_TOKEN_REFRESH_WINDOW_SECONDS')),
  ssmPathPrefix: requireEnv('THIRD_PARTY_TOKEN_CONFIG_SSM_PATH')
})
