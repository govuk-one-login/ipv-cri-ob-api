import type { TokenCredentials } from '@lib/token-rotator/model/token-credentials'

export interface TokenRotationOutput {
  expiresAtSeconds: number
  tokenValue: string
}

export interface TokenRotationStrategy {
  rotate: (credentials: TokenCredentials) => Promise<TokenRotationOutput>
}
