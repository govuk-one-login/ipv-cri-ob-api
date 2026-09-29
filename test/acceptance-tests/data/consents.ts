const returnUrl = (): string => {
  const environment = process.env['ENVIRONMENT']
  if (!environment) throw new Error('ENVIRONMENT is not set')
  return `https://review-ob.${environment}.account.gov.uk/confirm-details-bank`
}

export const consentsRequestBody = (bankId: string): string =>
  JSON.stringify({ bank_id: bankId, return_url: returnUrl() })
