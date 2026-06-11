import { apiFetch, type ApiResponse, mergeHeaders } from '../utils/api-client.js'

export class IdentityVerificationClient {
  private readonly bearerToken: string
  private readonly endpoint: string

  constructor(baseUrl: string, bearerToken: string) {
    this.endpoint = `${baseUrl}/consents`
    this.bearerToken = bearerToken
  }

  async postIdentityVerification(
    consentId: string,
    body: Record<string, unknown>,
    options?: RequestInit
  ): Promise<ApiResponse> {
    return apiFetch(`${this.endpoint}/${consentId}/identity-verification`, {
      ...options,
      body: JSON.stringify(body),
      headers: mergeHeaders(
        { Authorization: `Bearer ${this.bearerToken}`, 'Content-Type': 'application/json' },
        options?.headers
      ),
      method: 'POST'
    })
  }
}
