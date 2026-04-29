import type { BanksParams } from '../data/banks'
import type { APIRequestContext, APIResponse } from '@playwright/test'

export class BanksPage {
  private readonly endpoint = '/banks'

  constructor(private readonly api: APIRequestContext) {}

  async getBanks(params?: BanksParams): Promise<APIResponse> {
    if (!params) return this.api.get(this.endpoint)

    const defined: Record<string, boolean | number | string> = {}
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) defined[key] = value as boolean | number | string
    }
    return this.api.get(this.endpoint, { params: defined })
  }
}
