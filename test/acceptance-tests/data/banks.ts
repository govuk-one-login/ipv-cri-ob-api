export interface BanksParams {
  country_iso_code?: string
  custom_list?: string
  Deprecated?: boolean
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

export const expectedBanksResponse = {
  data: [
    {
      abilities: {
        account: true,
        balance: true,
        direct_debits: true,
        offers: true,
        parties: true,
        scheduled_payments: true,
        standing_orders: true,
        statements: true,
        transactions: true
      },
      bank_id: 'obie-barclays-production',
      country_iso_code: '',
      division: 'Personal, Business, Corporate etc.',
      friendly_name: 'Barclays',
      group: 'Barclays, Capital One, Halifax, HSBC etc.',
      icon: 'https://<uri>',
      is_sandbox: false,
      logo: 'https://<uri>',
      name: 'Barclays Personal',
      order: 0,
      service_status: true,
      standard: 'obie'
    }
  ],
  meta: {
    current_page: 0,
    total_count: 0,
    total_pages: 0
  }
}
