import type { TokenProfile } from '@common/util/oauth-client-id'

import { createBaseHttpClient } from '@common/client/base-http-client'
import { requireEnv } from '@common/util/env'
import { parseProfiles } from '@common/util/oauth-client-id'

export interface EcospendConsentClient {
  createConsent: (
    profile: TokenProfile,
    body: EcospendCreateConsentRequest
  ) => Promise<EcospendCreateConsentResponse>
}

interface EcospendConsentClientCollaborators {
  baseUrls: Partial<Record<TokenProfile, string>>
  tokenProvider: (profile: string) => Promise<string>
}

interface EcospendCreateConsentRequest {
  additional_params?: string // "foo=bar,baz=qux"
  bank_id: string
  permissions: ['Account']
  redirect_url: string
  user_info?: {
    name: string
    surname: string
  }
}

interface EcospendCreateConsentResponse {
  bank_consent_url: string
  bank_id: string
  bank_reference_id: string
  consent_end_date: string
  consent_expiry_date: string
  id: string
  redirect_url: string
  status: string
}

const enabledProfiles = parseProfiles(requireEnv('TOKEN_ROTATOR_PROFILES'))

const baseUrls: Partial<Record<TokenProfile, string>> = Object.fromEntries(
  enabledProfiles.map((profile) => [profile, requireEnv(`ECOSPEND_BASE_AIS_URL_${profile}`)])
)

export const createEcospendConsentClient = (
  collaborators: EcospendConsentClientCollaborators
): EcospendConsentClient => {
  const httpClient = (profile: TokenProfile) =>
    createBaseHttpClient(() => collaborators.tokenProvider(profile))

  return {
    createConsent: async (profile, body) => {
      const baseUrl = collaborators.baseUrls[profile]
      if (!baseUrl)
        throw new Error(
          `No ECOSPEND_BASE_AIS_URL mapping is configured for token profile "${profile}"`
        )

      const res = await httpClient(profile).post(baseUrl, JSON.stringify(body))
      if (!res.ok) throw new Error(`Ecospend createConsent failed: ${res.status} ${res.statusText}`)

      return (await res.json()) as EcospendCreateConsentResponse
    }
  }
}

export const ecospendConsentClient = createEcospendConsentClient({
  baseUrls,
  tokenProvider: () => new Promise<string>(() => 'blah') // TODO
})
