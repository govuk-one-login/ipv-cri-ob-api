import { apiFetch, type ApiResponse, mergeHeaders } from '../utils/api-client.js'

export class BanksClient {
  private readonly endpoint: string
  private readonly sessionId: string

  constructor(baseUrl: string, sessionId: string) {
    this.endpoint = `${baseUrl}/banks`
    this.sessionId = sessionId
  }

  async getBanks(options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      headers: mergeHeaders({ 'session-id': this.sessionId }, options?.headers)
    })
  }
}
