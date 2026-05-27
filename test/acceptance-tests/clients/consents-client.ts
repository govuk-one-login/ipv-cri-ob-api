import { apiFetch, type ApiResponse } from '../utils/api-client.js'

export class ConsentsClient {
  bearerToken!: string
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/consents`
  }

  async createConsent(body: Record<string, unknown>, options?: RequestInit): Promise<ApiResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>)
    }
    Object.keys(headers).forEach((k) => headers[k] === undefined && delete headers[k])
    return apiFetch(this.endpoint, {
      ...options,
      body: JSON.stringify(body),
      headers,
      method: 'POST'
    })
  }

  async getConsent(id: string, options?: RequestInit): Promise<ApiResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.bearerToken}`,
      ...(options?.headers as Record<string, string>)
    }
    Object.keys(headers).forEach((k) => headers[k] === undefined && delete headers[k])
    return apiFetch(`${this.endpoint}/${id}`, { ...options, headers })
  }
}
