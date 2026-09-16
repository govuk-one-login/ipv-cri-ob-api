import { READ_EXPIRY_PAD_SECONDS } from '@lib/token-rotator/util/token-expiry'

export const parseRefreshWindowSeconds = (raw: string): number => {
  const value = Number(raw)

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Refresh window must be a positive number, got "${raw}"`)
  }

  if (value <= READ_EXPIRY_PAD_SECONDS) {
    throw new Error(
      `Refresh window must be greater than read expiry pad (${READ_EXPIRY_PAD_SECONDS} seconds)`
    )
  }

  return value
}
