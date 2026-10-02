import { apiFetch, type ApiResponse, mergeHeaders } from '../utils/api-client'

export interface ConsentsResponse {
  cached?: boolean
  id: string
  url: string
  urlExpiresAtSeconds: number
}

export class ConsentsClient {
  private readonly endpoint: string
  private readonly sessionId: string

  constructor(baseUrl: string, sessionId: string) {
    this.endpoint = `${baseUrl}/consents`
    this.sessionId = sessionId
  }

  async createConsent(body: string, options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      body,
      headers: mergeHeaders(
        { 'Content-Type': 'application/json', 'session-id': this.sessionId },
        options?.headers
      ),
      method: 'POST'
    })
  }
}
