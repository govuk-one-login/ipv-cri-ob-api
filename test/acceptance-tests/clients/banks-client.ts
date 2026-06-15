import type { BanksRequestParams } from '../../../src/types/banks.js'

import { apiFetch, type ApiResponse } from '../utils/api-client.js'

export class BanksClient {
  private readonly endpoint: string

  constructor(baseUrl: string) {
    this.endpoint = `${baseUrl}/banks`
  }

  async getBanks(params?: BanksRequestParams, options?: RequestInit): Promise<ApiResponse> {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
    const query = entries.length ? `?${new URLSearchParams(entries).toString()}` : ''
    return apiFetch(`${this.endpoint}${query}`, options)
  }
}
