import { EndpointProfile } from '@common/model/endpoint-profile'
import { logger } from '@govuk-one-login/cri-logger'

export const OAuthClientId = {
  IPV_CORE: 'ipv-core',
  IPV_CORE_STUB: 'ipv-core-stub',
  IPV_CORE_STUB_AWS_HEADLESS: 'ipv-core-stub-aws-headless',
  IPV_CORE_STUB_AWS_BUILD: 'ipv-core-stub-aws-build',
  IPV_CORE_STUB_AWS_BUILD_THIRD_PARTY: 'ipv-core-stub-aws-build_3rdparty',
  IPV_CORE_STUB_AWS_PROD: 'ipv-core-stub-aws-prod',
  IPV_CORE_STUB_AWS_PROD_THIRD_PARTY: 'ipv-core-stub-aws-prod_3rdparty',
  IPV_CORE_STUB_PRE_PROD_AWS_BUILD: 'ipv-core-stub-pre-prod-aws-build',
  IPV_CORE_THIRD_PARTY_STUBS: 'ipv-core-3rd-party-stubs'
} as const

export type OAuthClientId = (typeof OAuthClientId)[keyof typeof OAuthClientId]

export const ClientIdToEndpointProfileMapping: Record<OAuthClientId, EndpointProfile> = {
  [OAuthClientId.IPV_CORE]: EndpointProfile.LIVE,
  [OAuthClientId.IPV_CORE_STUB]: EndpointProfile.STUB,
  // TODO: HEADLESS should point to STUB once imposter stubs are aligned and working
  [OAuthClientId.IPV_CORE_STUB_AWS_HEADLESS]: EndpointProfile.UAT,
  [OAuthClientId.IPV_CORE_STUB_AWS_BUILD]: EndpointProfile.STUB,
  [OAuthClientId.IPV_CORE_STUB_AWS_BUILD_THIRD_PARTY]: EndpointProfile.UAT,
  [OAuthClientId.IPV_CORE_STUB_AWS_PROD]: EndpointProfile.STUB,
  [OAuthClientId.IPV_CORE_STUB_AWS_PROD_THIRD_PARTY]: EndpointProfile.UAT,
  [OAuthClientId.IPV_CORE_STUB_PRE_PROD_AWS_BUILD]: EndpointProfile.LIVE,
  [OAuthClientId.IPV_CORE_THIRD_PARTY_STUBS]: EndpointProfile.STUB
} as const

const isOAuthClientId = (value: string): value is OAuthClientId =>
  (Object.values(OAuthClientId) as string[]).includes(value)

export const getEndpointProfileForClientId = (clientId: string): EndpointProfile => {
  const possibleOAuthClientId = isOAuthClientId(clientId) ? clientId : undefined
  if (possibleOAuthClientId) {
    return ClientIdToEndpointProfileMapping[possibleOAuthClientId]
  } else {
    logger.error(`Unknown OAuth Client: ${clientId}, defaulting to LIVE profile`)
    return EndpointProfile.LIVE
  }
}
