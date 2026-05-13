import { apiFetch, type ApiResponse } from '../utils/api-client.js'

export class ConsentsClient {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/consents`
  }

  async createConsent(body: Record<string, unknown>, options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      method: 'POST'
    })
  }

  async getConsent(id: string, options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(`${this.endpoint}/${id}`, options)
  }
}
