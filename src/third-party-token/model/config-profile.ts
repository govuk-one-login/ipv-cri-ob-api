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

export const ConfigProfileName = {
  LIVE: 'LIVE',
  STUB: 'STUB',
  UAT: 'UAT'
} as const

export type ConfigProfileName = (typeof ConfigProfileName)[keyof typeof ConfigProfileName]

export const ClientIDToConfigProfileMapping: Record<OAuthClientID, ConfigProfileName> = {
  [OAuthClientID.IPV_CORE]: ConfigProfileName.LIVE,
  [OAuthClientID.IPV_CORE_STUB]: ConfigProfileName.STUB,
  [OAuthClientID.IPV_CORE_STUB_AWS_BUILD]: ConfigProfileName.STUB,
  [OAuthClientID.IPV_CORE_STUB_AWS_BUILD_THIRD_PARTY]: ConfigProfileName.UAT,
  [OAuthClientID.IPV_CORE_STUB_AWS_PROD]: ConfigProfileName.STUB,
  [OAuthClientID.IPV_CORE_STUB_AWS_PROD_THIRD_PARTY]: ConfigProfileName.UAT,
  [OAuthClientID.IPV_CORE_STUB_PRE_PROD_AWS_BUILD]: ConfigProfileName.LIVE,
  [OAuthClientID.IPV_CORE_THIRD_PARTY_STUBS]: ConfigProfileName.STUB
} as const
