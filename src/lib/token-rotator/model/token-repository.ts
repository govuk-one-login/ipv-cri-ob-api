import type { TokenEntity } from '@lib/token-rotator/model/token-entity'

export interface TokenRepository {
  getToken: (profile: string) => Promise<TokenEntity | undefined>
  putToken: (entity: TokenEntity) => Promise<void>
}
