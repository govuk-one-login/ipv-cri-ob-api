export const WebhookIngestOutcome = {
  ACCEPTED: 200,
  ACCEPTED_DUPLICATE: 200,
  SIGNATURE_INVALID: 401,
  PAYLOAD_INVALID: 400
} as const

export type WebhookIngestOutcome = (typeof WebhookIngestOutcome)[keyof typeof WebhookIngestOutcome]
