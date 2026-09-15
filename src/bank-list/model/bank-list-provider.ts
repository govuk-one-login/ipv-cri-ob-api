import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { StoredBank } from '@src/bank-list/model/bank-list'

export interface BankListProvider {
  getBanks: (
    profile: EndpointProfile,
    rawRequestConfig: Record<string, string>
  ) => Promise<StoredBank[]>
}
