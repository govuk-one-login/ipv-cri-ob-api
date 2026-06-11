import { apiFetch, type ApiResponse, mergeHeaders } from '../utils/api-client.js'

export class ConsentsClient {
  private readonly bearerToken: string
  private readonly endpoint: string

  constructor(baseUrl: string, bearerToken: string) {
    this.endpoint = `${baseUrl}/consents`
    this.bearerToken = bearerToken
  }

  async createConsent(body: Record<string, unknown>, options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      body: JSON.stringify(body),
      headers: mergeHeaders(
        { Authorization: `Bearer ${this.bearerToken}`, 'Content-Type': 'application/json' },
        options?.headers
      ),
      method: 'POST'
    })
  }

  async getConsent(id: string, options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(`${this.endpoint}/${id}`, {
      ...options,
      headers: mergeHeaders({ Authorization: `Bearer ${this.bearerToken}` }, options?.headers)
    })
  }
}
