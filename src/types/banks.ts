export interface Bank {
  abilities: BankAbilities
  bank_id: string
  country_iso_code: string
  division: string
  friendly_name: string
  group: string
  icon: string
  is_sandbox: boolean
  logo: string
  name: string
  order: number
  service_status: boolean
  standard: string
}

export interface BankAbilities {
  account: boolean
  balance: boolean
  direct_debits: boolean
  offers: boolean
  parties: boolean
  scheduled_payments: boolean
  standing_orders: boolean
  statements: boolean
  transactions: boolean
}

export interface BanksMeta {
  current_page: number
  total_count: number
  total_pages: number
}

export interface BanksRequestParams {
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

export interface BanksResponse {
  data: Bank[]
  meta: BanksMeta
}
