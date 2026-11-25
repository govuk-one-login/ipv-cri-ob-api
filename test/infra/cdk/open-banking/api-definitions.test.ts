import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const apiDirectory = resolve(import.meta.dirname, '../../../../infra/open-banking/api')

const definition = (file: string): unknown =>
  parse(readFileSync(resolve(apiDirectory, file), 'utf8'))

const proxyTo = { 'x-amazon-apigateway-integration': { type: 'aws_proxy' } }
const validated = { 'x-amazon-apigateway-request-validator': 'Validate both' }

describe('public API definition', () => {
  it('serves health, JWKS, token and webhook routes, validated and secured', () => {
    expect(definition('public-api.yaml')).toMatchObject({
      components: {
        schemas: {
          Error: {},
          JWKSFile: {},
          TokenResponse: {},
          WebhookRequest: {
            properties: { event_id: { format: 'uuid', type: 'string' } },
            required: expect.arrayContaining(['event_id'])
          }
        }
      },
      info: { title: 'Open Banking Credential Issuer Public API' },
      openapi: '3.0.1',
      paths: {
        '/.well-known/jwks.json': { get: { 'x-amazon-apigateway-integration': { type: 'aws' } } },
        '/health': { get: { 'x-amazon-apigateway-integration': { type: 'mock' } } },
        '/token': {
          post: {
            ...proxyTo,
            ...validated,
            security: [{ api_key: expect.anything() }]
          }
        },
        '/webhooks': {
          post: {
            ...proxyTo,
            ...validated,
            parameters: expect.arrayContaining([
              expect.objectContaining({ in: 'header', name: 'x-signature', required: true })
            ]),
            requestBody: {
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/WebhookRequest' } }
              },
              required: true
            }
          }
        }
      },
      'x-amazon-apigateway-request-validators': { 'Validate both': {} }
    })
  })
})

describe('private API definition', () => {
  it('serves banks, consents, authorization and session routes, validated', () => {
    expect(definition('private-api.yaml')).toMatchObject({
      components: {
        parameters: { SessionHeader: { in: 'header', required: true } },
        schemas: { Authorization: {}, AuthorizationResponse: {}, Error: {}, Session: {} }
      },
      info: { title: 'Open Banking Credential Issuer Private API' },
      openapi: '3.0.1',
      paths: {
        '/authorization': { get: validated },
        '/banks': { get: { ...proxyTo, ...validated } },
        '/consents': { post: { ...proxyTo, ...validated } },
        '/session': { post: validated }
      },
      'x-amazon-apigateway-request-validators': { 'Validate both': {}, 'Validate Param only': {} }
    })
  })
})
