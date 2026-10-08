import type { TokenCredentials } from '@lib/token-rotator/model/token-credentials'

export interface TokenRotationOutput {
  expiresAtSeconds: number
  tokenValue: string
}

export interface TokenRotationStrategy<TProfile extends string> {
  rotate: (profile: TProfile, credentials: TokenCredentials) => Promise<TokenRotationOutput>
}
