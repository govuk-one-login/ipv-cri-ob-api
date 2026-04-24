import type { APIRequestContext, APIResponse } from 'playwright'

export class SessionPage {
  private readonly endpoint = '/session'

  constructor(private readonly api: APIRequestContext) {}

  async createSession(body: Record<string, unknown>): Promise<APIResponse> {
    return this.api.post(this.endpoint, { data: body })
  }
}
