import type { ProviderCredentials } from '@src/token-rotator/model/provider-credentials'

export interface TokenRotationOutput {
  expiresAtSeconds: number
  tokenValue: string
}

export interface TokenRotationStrategy {
  rotate: (credentials: ProviderCredentials) => Promise<TokenRotationOutput>
}
