import { apiFetch, type ApiResponse } from '../utils/api-client.js'

export class IdentityVerificationClient {
  bearerToken!: string
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/consents`
  }

  async postIdentityVerification(
    consentId: string,
    body: Record<string, unknown>,
    options?: RequestInit
  ): Promise<ApiResponse> {
    return apiFetch(`${this.endpoint}/${consentId}/identity-verification`, {
      ...options,
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
        ...options?.headers
      },
      method: 'POST'
    })
  }
}
