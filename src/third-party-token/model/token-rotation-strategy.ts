import type { ZodType } from 'zod'

export interface TokenRotationOutput {
  expiresAtSeconds: number
  tokenValue: string
}

export interface TokenRotationStrategy<TRequest> {
  requestSchema: ZodType<TRequest>
  rotate: (input: { request: TRequest }) => Promise<TokenRotationOutput>
}
