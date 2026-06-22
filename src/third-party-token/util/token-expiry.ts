import type { TokenEntity } from '@src/third-party-token/model/token-entity'

const READ_EXPIRY_PAD_SECONDS = 30

const nowSeconds = (): number => Math.floor(Date.now() / 1000)

export const isTokenExpiredForRead = (entity: TokenEntity): boolean =>
  nowSeconds() >= entity.ttl - READ_EXPIRY_PAD_SECONDS

export const isTokenDueForRotation = (entity: TokenEntity, refreshWindowSeconds: number): boolean =>
  nowSeconds() >= entity.ttl - refreshWindowSeconds

export const formatTokenExpiry = (ttlEpochSeconds: number): string =>
  new Date(ttlEpochSeconds * 1000).toISOString()
