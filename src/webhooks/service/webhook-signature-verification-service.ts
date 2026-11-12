import crypto from 'node:crypto'

export const verifySignature = ({
  webhookSigningKey,
  eventBody,
  providedSignature
}: {
  eventBody: string
  providedSignature: string
  webhookSigningKey: string
}): boolean => {
  const computedSignature = crypto
    .createHmac('sha256', webhookSigningKey)
    .update(eventBody)
    .digest('hex')

  const computedSignatureBuffer = Buffer.from(computedSignature)
  const providedSignatureBuffer = Buffer.from(providedSignature)

  return (
    computedSignatureBuffer.length === providedSignatureBuffer.length &&
    crypto.timingSafeEqual(computedSignatureBuffer, providedSignatureBuffer)
  )
}
