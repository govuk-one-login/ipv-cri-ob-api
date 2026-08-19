// TODO DELETE ME I'M REDUNDANT (AFTER 2422)

export const TokenProfile = {
  LIVE: 'LIVE',
  STUB: 'STUB',
  UAT: 'UAT'
} as const

export type TokenProfile = (typeof TokenProfile)[keyof typeof TokenProfile]

export const OAuthClientId = {
  IPV_CORE: 'ipv-core',
  IPV_CORE_STUB: 'ipv-core-stub',
  IPV_CORE_STUB_AWS_BUILD: 'ipv-core-stub-aws-build',
  IPV_CORE_STUB_AWS_BUILD_THIRD_PARTY: 'ipv-core-stub-aws-build_3rdparty',
  IPV_CORE_STUB_AWS_PROD: 'ipv-core-stub-aws-prod',
  IPV_CORE_STUB_AWS_PROD_THIRD_PARTY: 'ipv-core-stub-aws-prod_3rdparty',
  IPV_CORE_STUB_PRE_PROD_AWS_BUILD: 'ipv-core-stub-pre-prod-aws-build',
  IPV_CORE_THIRD_PARTY_STUBS: 'ipv-core-3rd-party-stubs'
} as const

export type OAuthClientId = (typeof OAuthClientId)[keyof typeof OAuthClientId]

export const ClientIdToTokenProfileMapping: Record<OAuthClientId, TokenProfile> = {
  [OAuthClientId.IPV_CORE]: TokenProfile.LIVE,
  [OAuthClientId.IPV_CORE_STUB]: TokenProfile.STUB,
  [OAuthClientId.IPV_CORE_STUB_AWS_BUILD]: TokenProfile.STUB,
  [OAuthClientId.IPV_CORE_STUB_AWS_BUILD_THIRD_PARTY]: TokenProfile.UAT,
  [OAuthClientId.IPV_CORE_STUB_AWS_PROD]: TokenProfile.STUB,
  [OAuthClientId.IPV_CORE_STUB_AWS_PROD_THIRD_PARTY]: TokenProfile.UAT,
  [OAuthClientId.IPV_CORE_STUB_PRE_PROD_AWS_BUILD]: TokenProfile.LIVE,
  [OAuthClientId.IPV_CORE_THIRD_PARTY_STUBS]: TokenProfile.STUB
} as const

const isOAuthClientId = (value: string): value is OAuthClientId =>
  (Object.values(OAuthClientId) as string[]).includes(value)

export const getTokenProfileForClientId = (clientID: string): TokenProfile => {
  const possibleOAuthClientId = isOAuthClientId(clientID) ? clientID : undefined
  if (possibleOAuthClientId) {
    return ClientIdToTokenProfileMapping[possibleOAuthClientId]
  } else {
    throw new Error('Unknown OAuth Client')
  }
}

const KNOWN_PROFILES = Object.values(TokenProfile) as TokenProfile[]

export const parseProfiles = (raw: string): TokenProfile[] => {
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
