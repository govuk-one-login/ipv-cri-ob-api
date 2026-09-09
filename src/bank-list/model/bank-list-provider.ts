import type { BanksEndpointProfile, StoredBank } from '@src/bank-list/model/bank-list'

export interface BankListProvider {
  getBanks: (
    profile: BanksEndpointProfile,
    rawRequestConfig: Record<string, string>
  ) => Promise<StoredBank[]>
}
