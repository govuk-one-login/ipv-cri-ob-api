import { apiFetch, type ApiResponse } from '../utils/api-client.js'

export class SessionClient {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/session`
  }

  async createSession(body: Record<string, unknown>, options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      method: 'POST'
    })
  }
}
