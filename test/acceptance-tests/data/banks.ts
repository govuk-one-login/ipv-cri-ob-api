import type { BanksRequestParams } from '../../../src/types/banks.js'

export const defaultBanksParams: BanksRequestParams = {
  country_iso_code: 'EN',
  custom_list: 'Account',
  Deprecated: true,
  division: 'Personal, Business, Corporate etc.',
  fetchAllBanks: true,
  group: 'Barclays',
  is_sandbox: true,
  page: 1,
  purpose: 'Account',
  service_status: true,
  standard: 'OBIE, STET, BerlinGroup'
}
