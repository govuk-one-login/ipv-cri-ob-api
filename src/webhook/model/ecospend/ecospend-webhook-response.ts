import { z } from 'zod'

export const ecospendWebhookResponseSchema = z
  .object({
    description: z.string().min(1)
  })
  .transform((response) => ({
    description: response.description
  }))
