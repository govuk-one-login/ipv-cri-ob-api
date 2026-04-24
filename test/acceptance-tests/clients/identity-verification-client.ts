import { apiFetch, type ApiResponse } from '../utils/api-client.js'

export class IdentityVerificationClient {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/consents`
  }

  async getIdentityVerification(consentId: string, options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(`${this.endpoint}/${consentId}/identity-verification`, options)
  }

  async postIdentityVerification(
    consentId: string,
    body: Record<string, unknown>,
    options?: RequestInit
  ): Promise<ApiResponse> {
    return apiFetch(`${this.endpoint}/${consentId}/identity-verification`, {
      ...options,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      method: 'POST'
    })
  }
}
