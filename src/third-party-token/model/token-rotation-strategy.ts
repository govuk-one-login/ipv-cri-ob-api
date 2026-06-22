import type { ZodType } from 'zod'

export interface TokenRotationOutput {
  expiresAtSeconds: number
  tokenValue: string
}

export interface TokenRotationStrategy<TConfig> {
  configSchema: ZodType<TConfig>
  rotate: (input: { config: TConfig }) => Promise<TokenRotationOutput>
}
