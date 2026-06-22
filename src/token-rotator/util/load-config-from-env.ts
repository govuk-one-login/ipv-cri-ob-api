import type { TokenRotationServiceConfig } from '@src/token-rotator/service/token-rotation-service'

import { TokenProfile } from '@src/token-rotator/model/token-profile'
import { requireEnv } from '@src/token-rotator/util/env'

const KNOWN_PROFILES = Object.values(TokenProfile) as TokenProfile[]

const parseProfiles = (raw: string): TokenProfile[] => {
  const profiles = raw
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
  if (profiles.length === 0) {
    throw new Error('TOKEN_ROTATOR_PROFILES must contain at least one profile')
  }
  const invalid = profiles.filter((p) => !KNOWN_PROFILES.includes(p as TokenProfile))
  if (invalid.length > 0) throw new Error(`Unknown profile(s): ${invalid.join(', ')}`)
  return profiles as TokenProfile[]
}

const parseRefreshWindow = (raw: string): number => {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS must be a positive number, got "${raw}"`)
  }
  return value
}

export const loadTokenRotatorConfigFromEnv = (): TokenRotationServiceConfig => ({
  credentialsPathPrefix: requireEnv('TOKEN_ROTATOR_CREDENTIALS_PATH'),
  profiles: parseProfiles(requireEnv('TOKEN_ROTATOR_PROFILES')),
  refreshWindowSeconds: parseRefreshWindow(requireEnv('TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS'))
})
