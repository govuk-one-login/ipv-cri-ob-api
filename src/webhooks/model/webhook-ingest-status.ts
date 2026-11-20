export const WebhookIngestStatus = {
  ACCEPTED: 200,
  ACCEPTED_DUPLICATE: 200,
  SIGNATURE_INVALID: 401,
  PAYLOAD_INVALID: 400
} as const

export type WebhookIngestStatus = (typeof WebhookIngestStatus)[keyof typeof WebhookIngestStatus]
