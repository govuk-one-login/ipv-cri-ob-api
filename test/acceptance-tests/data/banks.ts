export interface BanksParams {
  country_iso_code?: string
  custom_list?: string
  deprecated?: boolean
  division?: string
  fetchAllBanks?: boolean
  group?: string
  is_sandbox?: boolean
  page?: number
  purpose?: string
  service_status?: boolean
  standard?: string
}

export const defaultBanksParams: BanksParams = {
  country_iso_code: 'EN',
  custom_list: 'Account',
  deprecated: true,
  division: 'Personal, Business, Corporate etc.',
  fetchAllBanks: true,
  group: 'Barclays',
  is_sandbox: true,
  page: 1,
  purpose: 'Account',
  service_status: true,
  standard: 'OBIE, STET, BerlinGroup'
}
