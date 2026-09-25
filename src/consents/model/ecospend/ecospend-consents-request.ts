import type { CreateConsentParams } from '@src/consents/model/consents-provider'

const ECOSPEND_CONSENT_REQUEST_PERMISSIONS = [
  'Account',
  'Balance',
  'Transactions',
  'DirectDebits',
  'StandingOrders',
  'ScheduledPayments'
] as const

export interface EcospendConsentsRequest {
  additional_params?: string // "foo=bar,baz=qux"
  bank_id: string
  permissions: readonly string[]
  redirect_url: string
  user_info?: {
    name: string
    surname: string
  }
}

export const toEcospendConsentsRequest = (
  params: CreateConsentParams
): EcospendConsentsRequest => ({
  bank_id: params.bankId,
  permissions: ECOSPEND_CONSENT_REQUEST_PERMISSIONS,
  redirect_url: params.returnUrl
})
