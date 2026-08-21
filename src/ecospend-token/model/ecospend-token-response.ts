import { z } from 'zod'

export const ecospendTokenResponseSchema = z
  .object({
    access_token: z.string().min(1), // could be z.jwt() but stubs will break
    expires_in: z.number().int().positive()
  })
  .transform((o) => ({
    expiresInSeconds: o.expires_in,
    tokenValue: o.access_token
  }))

export type EcospendTokenResponse = z.infer<typeof ecospendTokenResponseSchema>
