import type { APIRequestContext, APIResponse } from 'playwright'

export class ConsentsPage {
  private readonly endpoint = '/consents'

  constructor(private readonly api: APIRequestContext) {}

  async createConsent(body: Record<string, unknown>): Promise<APIResponse> {
    return this.api.post(this.endpoint, { data: body })
  }

  async getConsent(id: string): Promise<APIResponse> {
    return this.api.get(`${this.endpoint}/${id}`)
  }
}
