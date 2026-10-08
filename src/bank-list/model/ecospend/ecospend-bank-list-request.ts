import type { GetBanksParams } from '@src/bank-list/model/bank-list-provider'

import { EndpointProfile } from '@common/model/endpoint-profile'

// Note: there's still an open question on if there are other acceptable divisions e.g. 'Private'
export const ECOSPEND_BANK_LIST_QUERY_PARAMS = {
  country_iso_code: 'GB',
  division: 'Personal',
  fetchAllBanks: 'true',
  standard: 'OBIE'
} as const

export const toEcospendBankListRequest = (params: GetBanksParams) => ({
  ...ECOSPEND_BANK_LIST_QUERY_PARAMS,
  is_sandbox: String(params.profile !== EndpointProfile.LIVE),
  ...(params.customList === undefined ? {} : { custom_list: params.customList })
})
