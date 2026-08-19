import { z } from 'zod'

export const consentRequestSchema = z
  .object({
    bank_id: z.string().min(1),
    return_url: z.url({ protocol: /^https?$/ })
  })
  .transform((o) => ({
    bankId: o.bank_id,
    returnUrl: o.return_url
  }))

export type ConsentRequest = z.infer<typeof consentRequestSchema>
