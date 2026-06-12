export interface IdentityScore {
  checkDetails: string[]
  contraIndicators: string[]
  failedCheckDetails: string[]
  sessionId: string
  strengthScore: number
  transactionId: string
  ttl: number
  validityScore: number
  verificationScore: number
}
