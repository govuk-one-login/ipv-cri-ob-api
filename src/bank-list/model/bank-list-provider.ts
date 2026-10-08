import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { StoredBank } from '@src/bank-list/model/database/bank-list-entity'

export interface BankListProvider {
  getBanks: (params: GetBanksParams) => Promise<StoredBank[]>
}

export interface GetBanksParams {
  accessToken: string
  customList?: string
  endpointUrl: string
  profile: EndpointProfile
}
