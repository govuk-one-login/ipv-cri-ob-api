import { verifySignature } from '@src/webhooks/service/webhook-signature-verification-service'
import { describe, expect, it } from 'vitest'

import crypto from 'node:crypto'

const SIGNING_KEY = 'test-signing-key'
const EVENT_BODY = '{"event_id":"event-123"}'

const computeSignature = (body: string, key: string = SIGNING_KEY) =>
  crypto.createHmac('sha256', key).update(body).digest('hex')

describe('verifySignature', () => {
  it('returns true for valid signature', () => {
    const providedSignature = computeSignature(EVENT_BODY, SIGNING_KEY)

    expect(
      verifySignature({ webhookSigningKey: SIGNING_KEY, eventBody: EVENT_BODY, providedSignature })
    ).toBe(true)
  })

  it('returns false for invalid signature', () => {
    expect(
      verifySignature({
        webhookSigningKey: SIGNING_KEY,
        eventBody: EVENT_BODY,
        providedSignature: 'invalid-signature'
      })
    ).toBe(false)
  })

  it('returns false for signature with wrong key', () => {
    const providedSignature = computeSignature(EVENT_BODY, 'wrong-key')

    expect(
      verifySignature({ webhookSigningKey: SIGNING_KEY, eventBody: EVENT_BODY, providedSignature })
    ).toBe(false)
  })

  it('returns false for signature with wrong body', () => {
    const providedSignature = computeSignature('wrong-body', SIGNING_KEY)

    expect(
      verifySignature({ webhookSigningKey: SIGNING_KEY, eventBody: EVENT_BODY, providedSignature })
    ).toBe(false)
  })

  it('returns false for signature with different length', () => {
    expect(
      verifySignature({
        webhookSigningKey: SIGNING_KEY,
        eventBody: EVENT_BODY,
        providedSignature: 'short'
      })
    ).toBe(false)
  })
})
