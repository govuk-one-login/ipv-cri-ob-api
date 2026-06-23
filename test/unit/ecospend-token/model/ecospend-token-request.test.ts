import { ecospendTokenRequestSchema } from '@src/ecospend-token/model/ecospend-token-request'
import { describe, expect, it } from 'vitest'

const validRawRequest = {
  'client-id': 'test-client-id',
  'client-secret': 'top-secret', // pragma: allowlist secret
  'endpoint-url': 'https://provider.test/token',
  'grant-type': 'client_credentials',
  scope: 'accounts'
}

describe('ecospendTokenRequestSchema', () => {
  it('maps kebab-case input to endpointUrl + nested formParams', () => {
    const parsed = ecospendTokenRequestSchema.parse(validRawRequest)

    expect(parsed).toEqual({
      endpointUrl: 'https://provider.test/token',
      formParams: {
        client_id: 'test-client-id',
        client_secret: 'top-secret', // pragma: allowlist secret
        grant_type: 'client_credentials',
        scope: 'accounts'
      }
    })
  })

  it.each<keyof typeof validRawRequest>([
    'client-id',
    'client-secret',
    'endpoint-url',
    'grant-type',
    'scope'
  ])('rejects when %s is missing', (field) => {
    const { [field]: _omitted, ...rest } = validRawRequest

    expect(ecospendTokenRequestSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects when a required field is empty', () => {
    const result = ecospendTokenRequestSchema.safeParse({ ...validRawRequest, 'client-id': '' })

    expect(result.success).toBe(false)
  })
})
