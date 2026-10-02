import { apiFetch, type ApiResponse, mergeHeaders } from '../utils/api-client'

export interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
}

export class TokenClient {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/token`
  }

  async createToken(body: Record<string, string>, options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      body: new URLSearchParams(body).toString(),
      headers: mergeHeaders(
        { 'Content-Type': 'application/x-www-form-urlencoded' },
        options?.headers
      ),
      method: 'POST'
    })
  }
}
