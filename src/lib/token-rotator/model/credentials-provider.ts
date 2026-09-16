import type { TokenCredentials } from '@lib/token-rotator/model/token-credentials'

export interface CredentialsProvider<TProfile extends string> {
  getCredentials: (profile: TProfile) => Promise<TokenCredentials>
}
