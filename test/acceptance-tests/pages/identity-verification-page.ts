import type { APIRequestContext, APIResponse } from 'playwright'

export class IdentityVerificationPage {
  private readonly endpoint = '/consents'

  constructor(private readonly api: APIRequestContext) {}

  async getIdentityVerification(consentId: string): Promise<APIResponse> {
    return this.api.get(`${this.endpoint}/${consentId}/identity-verification`)
  }

  async postIdentityVerification(
    consentId: string,
    body: Record<string, unknown>
  ): Promise<APIResponse> {
    return this.api.post(`${this.endpoint}/${consentId}/identity-verification`, { data: body })
  }
}
