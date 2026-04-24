import type { APIRequestContext, APIResponse } from '@playwright/test'

export class TokenPage {
  private readonly endpoint = '/token'

  constructor(private readonly api: APIRequestContext) {}

  async createToken(body: Record<string, unknown>): Promise<APIResponse> {
    return this.api.post(this.endpoint, { data: body })
  }
}
