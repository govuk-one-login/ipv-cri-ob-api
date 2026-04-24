import { apiFetch, type ApiResponse, type RequestOptions } from '../utils/api-client.js'

export class IdentityVerificationPage {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/consents`
  }

  async getIdentityVerification(consentId: string, options?: RequestOptions): Promise<ApiResponse> {
    return apiFetch(`${this.endpoint}/${consentId}/identity-verification`, options)
  }

  async postIdentityVerification(
    consentId: string,
    body: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<ApiResponse> {
    return apiFetch(`${this.endpoint}/${consentId}/identity-verification`, {
      ...options,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      method: 'POST'
    })
  }
}
