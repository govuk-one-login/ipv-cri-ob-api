import { apiFetch, type ApiResponse } from '../utils/api-client.js'

export class TokenClient {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/token`
  }

  async createToken(body: URLSearchParams, options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      body: body.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...options?.headers },
      method: 'POST'
    })
  }
}
