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

export const missingFieldsConsentsRequest = {
  bank_id: 'obie-barclays-production'
}

export const invalidConsentsRequest = {
  ...validConsentsRequest,
  bank_id: 'invalid-bank-id',
  consent_end_date: 'not-a-date'
}
