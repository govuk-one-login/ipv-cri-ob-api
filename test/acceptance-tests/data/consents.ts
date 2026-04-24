export const validConsentsRequest = {
  additional_params: '<additional-params>',
  allowed_account_type: 'Any',
  bank_id: 'obie-barclays-production',
  consent_end_date: '2026-04-24T17:27:59.114Z',
  creation_reason: 'Regular',
  merchant_id: '<merchant-id>',
  merchant_user_id: '<merchant-user-id>',
  permissions: ['Account'],
  redirect_url: 'https://<redirect-uri>',
  user_info: {
    device_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    email: '<email>',
    name: '<name>',
    national_id: '<national-id>',
    phone: '<phone>',
    surname: '<surname>'
  }
}

export const validConsentId = 'test-consent-id'

export interface ConsentResponse {
  bank_consent_url: string
  bank_id: string
  bank_reference_id: string
  consent_end_date: string
  consent_expiry_date: string
  failure_reason?: {
    code: string
    message: string
  }
  id: string
  permissions: string[]
  redirect_url: string
  status: string
  user_info: {
    device_id: string
    email: string
    name: string
    national_id: string
    phone: string
    surname: string
  }
}

export const expectedConsentResponseFields = [
  'id',
  'bank_reference_id',
  'bank_consent_url',
  'bank_id',
  'status',
  'redirect_url',
  'consent_end_date',
  'consent_expiry_date',
  'permissions',
  'user_info'
]
