import { apiFetch, type ApiResponse, mergeHeaders } from '../utils/api-client.js'

export interface SessionResponse {
  redirect_uri: string
  session_id: string
  state: string
}

export class SessionClient {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/session`
  }

  async createSession(body: Record<string, unknown>, options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      body: JSON.stringify(body),
      headers: mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers),
      method: 'POST'
    })
  }
}
