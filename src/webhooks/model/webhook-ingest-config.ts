import { z } from 'zod'

export const webhookIngestConfigSchema = z.record(z.string(), z.string().min(1)).transform((o) => ({
  signingSecrets: Object.values(o)
}))

export type WebhookIngestConfig = z.infer<typeof webhookIngestConfigSchema>
