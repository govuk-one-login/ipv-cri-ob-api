export const validConsentsRequest = {
  additional_params: 'foo=bar,baz=qux',
  bank_id: 'iron-bank',
  permissions: ['Account'],
  redirect_url: 'https://review-ob.dev.account.gov.uk/return',
  user_info: {
    name: 'Kenneth',
    surname: 'Decerqueira'
  }
}

export const missingFieldsConsentsRequest = {
  bank_id: 'iron-bank'
}

export const invalidConsentsRequest = {
  ...validConsentsRequest,
  bank_id: 'invalid-bank-id'
}
