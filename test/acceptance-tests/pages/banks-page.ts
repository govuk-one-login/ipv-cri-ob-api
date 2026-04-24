import type { BanksParams } from '../data/banks.js'
import type { APIRequestContext, APIResponse } from 'playwright'

export class BanksPage {
  private readonly endpoint = '/banks'

  constructor(private readonly api: APIRequestContext) {}

  async getBanks(params?: BanksParams): Promise<APIResponse> {
    if (!params) {
      return this.api.get(this.endpoint)
    }

    const queryParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryParams.set(key, String(value))
      }
    }

    return this.api.get(`${this.endpoint}?${queryParams.toString()}`)
  }
}
