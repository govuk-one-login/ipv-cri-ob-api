import { apiFetch, type ApiResponse, type RequestOptions } from '../utils/api-client.js'

export class TokenPage {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/token`
  }

  async createToken(body: Record<string, unknown>, options?: RequestOptions): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      method: 'POST'
    })
  }
}
