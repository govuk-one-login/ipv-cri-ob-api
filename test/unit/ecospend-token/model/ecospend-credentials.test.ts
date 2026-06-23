import { ecospendCredentialsSchema } from '@src/ecospend-token/model/ecospend-credentials'
import { describe, expect, it } from 'vitest'

const validRawCredentials = {
  'client-id': 'test-client-id',
  'client-secret': 'top-secret', // pragma: allowlist secret
  'endpoint-url': 'https://provider.test/token',
  'grant-type': 'client_credentials',
  scope: 'accounts'
}

describe('ecospendCredentialsSchema', () => {
  it('maps kebab-case input to endpointUrl + nested formParams', () => {
    const parsed = ecospendCredentialsSchema.parse(validRawCredentials)

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

  it.each<keyof typeof validRawCredentials>([
    'client-id',
    'client-secret',
    'endpoint-url',
    'grant-type',
    'scope'
  ])('rejects when %s is missing', (field) => {
    const { [field]: _omitted, ...rest } = validRawCredentials

    expect(ecospendCredentialsSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects when a required field is empty', () => {
    const result = ecospendCredentialsSchema.safeParse({ ...validRawCredentials, 'client-id': '' })

    expect(result.success).toBe(false)
  })
})
