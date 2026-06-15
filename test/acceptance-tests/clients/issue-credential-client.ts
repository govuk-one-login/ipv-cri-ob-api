import { apiFetch, type ApiResponse, mergeHeaders } from '../utils/api-client.js'

export class IssueCredentialClient {
  private readonly bearerToken: string
  private readonly endpoint: string

  constructor(baseUrl: string, bearerToken: string) {
    this.endpoint = `${baseUrl}/credential/issue`
    this.bearerToken = bearerToken
  }

  async issueCredential(options?: RequestInit): Promise<ApiResponse> {
    return apiFetch(this.endpoint, {
      ...options,
      headers: mergeHeaders({ Authorization: `Bearer ${this.bearerToken}` }, options?.headers),
      method: 'POST'
    })
  }
}
