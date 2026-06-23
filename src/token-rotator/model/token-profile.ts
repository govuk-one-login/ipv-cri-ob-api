export const OAuthClientID = {
  IPV_CORE: 'ipv-core',
  IPV_CORE_STUB: 'ipv-core-stub',
  IPV_CORE_STUB_AWS_BUILD: 'ipv-core-stub-aws-build',
  IPV_CORE_STUB_AWS_BUILD_THIRD_PARTY: 'ipv-core-stub-aws-build_3rdparty',
  IPV_CORE_STUB_AWS_PROD: 'ipv-core-stub-aws-prod',
  IPV_CORE_STUB_AWS_PROD_THIRD_PARTY: 'ipv-core-stub-aws-prod_3rdparty',
  IPV_CORE_STUB_PRE_PROD_AWS_BUILD: 'ipv-core-stub-pre-prod-aws-build',
  IPV_CORE_THIRD_PARTY_STUBS: 'ipv-core-3rd-party-stubs'
} as const

export type OAuthClientID = (typeof OAuthClientID)[keyof typeof OAuthClientID]

export const TokenProfile = {
  LIVE: 'LIVE',
  STUB: 'STUB',
  UAT: 'UAT'
} as const

export type TokenProfile = (typeof TokenProfile)[keyof typeof TokenProfile]

export const ClientIDToTokenProfileMapping: Record<OAuthClientID, TokenProfile> = {
  [OAuthClientID.IPV_CORE]: TokenProfile.LIVE,
  [OAuthClientID.IPV_CORE_STUB]: TokenProfile.STUB,
  [OAuthClientID.IPV_CORE_STUB_AWS_BUILD]: TokenProfile.STUB,
  [OAuthClientID.IPV_CORE_STUB_AWS_BUILD_THIRD_PARTY]: TokenProfile.UAT,
  [OAuthClientID.IPV_CORE_STUB_AWS_PROD]: TokenProfile.STUB,
  [OAuthClientID.IPV_CORE_STUB_AWS_PROD_THIRD_PARTY]: TokenProfile.UAT,
  [OAuthClientID.IPV_CORE_STUB_PRE_PROD_AWS_BUILD]: TokenProfile.LIVE,
  [OAuthClientID.IPV_CORE_THIRD_PARTY_STUBS]: TokenProfile.STUB
} as const
