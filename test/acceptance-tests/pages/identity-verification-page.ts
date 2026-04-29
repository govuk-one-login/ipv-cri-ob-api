import type { IdentityVerificationResponse } from '../data/identity-verification'
import type { APIRequestContext, APIResponse } from '@playwright/test'

export class IdentityVerificationPage {
  private readonly endpoint = '/consents'

  constructor(private readonly api: APIRequestContext) {}

  async getIdentityVerification(consentId: string): Promise<APIResponse> {
    return this.api.get(`${this.endpoint}/${consentId}/identity-verification`)
  }

  //TODO - To be updated if required, generic parseBody method in fixtures.ts
  async parseResponse(response: APIResponse): Promise<IdentityVerificationResponse> {
    return (await response.json()) as IdentityVerificationResponse
  }

  async postIdentityVerification(
    consentId: string,
    body: Record<string, unknown>
  ): Promise<APIResponse> {
    return this.api.post(`${this.endpoint}/${consentId}/identity-verification`, { data: body })
  }
}
