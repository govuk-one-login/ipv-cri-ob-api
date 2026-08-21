export const TokenProfile = {
  LIVE: 'LIVE',
  STUB: 'STUB',
  UAT: 'UAT'
} as const

export type TokenProfile = (typeof TokenProfile)[keyof typeof TokenProfile]
