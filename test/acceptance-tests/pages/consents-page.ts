import { apiFetch, type ApiResponse, type RequestOptions } from '../utils/api-client.js'

export class ConsentsPage {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/consents`
  }

  async createConsent(
    body: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      method: 'POST'
    })
  }

  async getConsent(id: string, options?: RequestOptions): Promise<ApiResponse> {
    return apiFetch(`${this.endpoint}/${id}`, options)
  }
}
