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
    name: string
    surname: string
  }
}

export interface ErrorResponse {
  code: string
  message: string
}
