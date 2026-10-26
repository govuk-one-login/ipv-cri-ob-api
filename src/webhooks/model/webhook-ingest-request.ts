import { z } from 'zod'

const jsonBodySchema = z.string().transform((body, ctx) => {
  try {
    return JSON.parse(body) as unknown
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Webhook body is not valid JSON' })
    return z.NEVER
  }
})

export const webhookIngestRequestSchema = jsonBodySchema
  .pipe(
    z.object({
      event_id: z.guid()
    })
  )
  .transform((o) => ({
    eventId: o.event_id
  }))

export type WebhookIngestRequest = z.infer<typeof webhookIngestRequestSchema>
