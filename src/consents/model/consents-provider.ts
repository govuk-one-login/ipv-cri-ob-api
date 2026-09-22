import type { EndpointProfile } from '@common/model/endpoint-profile'

export interface ConsentsProvider {
  createConsent: (request: CreateConsentRequest) => Promise<CreatedConsent>
}

export interface CreateConsentRequest {
  accessToken: string
  bankId: string
  endpointUrl: string
  profile: EndpointProfile
  returnUrl: string
}

export interface CreatedConsent {
  bankConsentUrl: string
  bankId: string
  consentId: string
}
