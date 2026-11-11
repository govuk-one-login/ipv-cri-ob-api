import { createHmac, timingSafeEqual } from 'node:crypto'

export type WebhookSignatureVerificationService = (request: {
  body: string
  signature: string
  signingSecret: string
}) => boolean

export const verifyWebhookSignature: WebhookSignatureVerificationService = ({
  body,
  signature,
  signingSecret
}) => {
  const expected = createHmac('sha256', signingSecret).update(body, 'utf8').digest()
  const provided = Buffer.from(signature, 'hex')
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}
