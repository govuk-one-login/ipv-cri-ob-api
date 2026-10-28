import { verifyWebhookSignature } from '@src/webhooks/service/webhook-signature-verification-service'
import { describe, expect, it } from 'vitest'

const SIGNING_SECRET = 'test-signing-secret' // pragma: allowlist secret
const BODY = '{"id":"webhook-123","status":"Completed"}'
const VALID_SIGNATURE = '23076392a45bb180113567cb27a84b06af451f3244fdeb484db3966306356109' // pragma: allowlist secret

describe('webhook-signature-verification-service', () => {
  it('accepts a signature matching the HMAC-SHA256 of the body', () => {
    expect(
      verifyWebhookSignature({
        body: BODY,
        signature: VALID_SIGNATURE,
        signingSecret: SIGNING_SECRET
      })
    ).toBe(true)
  })

  it('accepts an upper-case hex signature', () => {
    expect(
      verifyWebhookSignature({
        body: BODY,
        signature: VALID_SIGNATURE.toUpperCase(),
        signingSecret: SIGNING_SECRET
      })
    ).toBe(true)
  })

  it('rejects a signature when the body has been altered', () => {
    expect(
      verifyWebhookSignature({
        body: '{"id":"webhook-123","status":"Failed"}',
        signature: VALID_SIGNATURE,
        signingSecret: SIGNING_SECRET
      })
    ).toBe(false)
  })

  it('rejects a signature made with a different secret', () => {
    expect(
      verifyWebhookSignature({
        body: BODY,
        signature: VALID_SIGNATURE,
        signingSecret: 'another-signing-secret' // pragma: allowlist secret
      })
    ).toBe(false)
  })

  it.each([
    ['empty', ''],
    ['truncated', VALID_SIGNATURE.slice(0, 32)],
    ['non-hex', 'z'.repeat(64)]
  ])('rejects a %s signature', (_, signature) => {
    expect(
      verifyWebhookSignature({
        body: BODY,
        signature,
        signingSecret: SIGNING_SECRET
      })
    ).toBe(false)
  })
})
