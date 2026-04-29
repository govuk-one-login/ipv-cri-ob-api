import type { ConsentResponse } from '../data/consents'
import type { APIRequestContext, APIResponse } from '@playwright/test'

export class ConsentsPage {
  private readonly endpoint = '/consents'

  constructor(private readonly api: APIRequestContext) {}

  async createConsent(body: Record<string, unknown>): Promise<APIResponse> {
    return this.api.post(this.endpoint, { data: body })
  }

  async getConsent(id: string): Promise<APIResponse> {
    return this.api.get(`${this.endpoint}/${id}`)
  }

  //TODO - To be updated if required, generic parseBody method in fixtures.ts
  async parseResponse(response: APIResponse): Promise<ConsentResponse> {
    return (await response.json()) as ConsentResponse
  }
}
