import type { BanksParams } from '../data/banks.js'

import { apiFetch, type ApiResponse, type RequestOptions } from '../utils/api-client.js'

export class BanksPage {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/banks`
  }

  async getBanks(params?: BanksParams, options?: RequestOptions): Promise<ApiResponse> {
    if (!params) return apiFetch(this.endpoint, options)
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    )
    return apiFetch(`${this.endpoint}?${query.toString()}`, options)
  }
}
