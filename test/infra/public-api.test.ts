import { loadTemplate, openApiSchema } from './helpers'
import { describe, expect, it } from 'vitest'

const template = loadTemplate('public-api.yaml')

const paths = template['paths'] as Record<string, Record<string, unknown>>

describe('public-api.yaml structure', () => {
  it('is a valid OpenAPI 3.x document', () => {
    expect(openApiSchema.safeParse(template).success).toBe(true)
  })

  it('has title', () => {
    const info = template['info'] as Record<string, string>
    expect(info['title']).toBe('Open Banking Credential Issuer Public API')
  })
})

describe('public-api.yaml paths', () => {
  const expectedPaths = ['/health', '/.well-known/jwks.json', '/token', '/webhooks']

  it.each(expectedPaths)('has path: %s', (path) => {
    expect(paths).toHaveProperty(path)
  })

  it('/health has GET with mock integration', () => {
    const get = paths['/health']?.['get'] as Record<string, unknown>
    const integration = get['x-amazon-apigateway-integration'] as Record<string, string>
    expect(integration['type']).toBe('mock')
  })

  it('/token has POST method', () => {
    expect(paths['/token']).toHaveProperty('post')
  })

  it('/.well-known/jwks.json has GET with S3 integration', () => {
    const get = paths['/.well-known/jwks.json']?.['get'] as Record<string, unknown>
    const integration = get['x-amazon-apigateway-integration'] as Record<string, string>
    expect(integration['type']).toBe('aws')
  })
})

describe('public-api.yaml components', () => {
  const components = template['components'] as Record<string, Record<string, unknown>>
  const schemas = components['schemas']

  it('defines required schemas', () => {
    expect(schemas).toHaveProperty('JWKSFile')
    expect(schemas).toHaveProperty('TokenResponse')
    expect(schemas).toHaveProperty('Error')
    expect(schemas).toHaveProperty('WebhookRequest')
  })

  it('WebhookRequest requires event_id as a uuid string', () => {
    const webhookRequest = (schemas as Record<string, unknown>)['WebhookRequest'] as Record<
      string,
      unknown
    >
    expect(webhookRequest['required']).toContain('event_id')
    const properties = webhookRequest['properties'] as Record<string, Record<string, string>>
    expect(properties['event_id']?.['type']).toBe('string')
    expect(properties['event_id']?.['format']).toBe('uuid')
  })
})

describe('public-api.yaml request validators', () => {
  const validators = template['x-amazon-apigateway-request-validators'] as Record<string, unknown>

  it('defines Validate both', () => {
    expect(validators).toHaveProperty('Validate both')
  })
})

describe('public-api.yaml /webhooks', () => {
  const post = paths['/webhooks']?.['post'] as Record<string, unknown>

  it('uses aws_proxy integration', () => {
    const integration = post['x-amazon-apigateway-integration'] as Record<string, string>
    expect(integration['type']).toBe('aws_proxy')
  })

  it('applies Validate both request validator', () => {
    expect(post['x-amazon-apigateway-request-validator']).toBe('Validate both')
  })

  it('has a required requestBody referencing WebhookRequest schema', () => {
    const requestBody = post['requestBody'] as Record<string, unknown>
    expect(requestBody['required']).toBe(true)
    const schema = (requestBody['content'] as Record<string, Record<string, unknown>>)?.[
      'application/json'
    ]?.['schema'] as Record<string, string>
    expect(schema['$ref']).toBe('#/components/schemas/WebhookRequest')
  })

  it('requires x-signature header parameter', () => {
    const parameters = post['parameters'] as Record<string, unknown>[]
    const sig = parameters.find((p) => p['name'] === 'x-signature')
    expect(sig).toBeDefined()
    expect(sig!['in']).toBe('header')
    expect(sig!['required']).toBe(true)
  })
})

describe('public-api.yaml /token security and validation', () => {
  const post = paths['/token']?.['post'] as Record<string, unknown>

  it('applies Validate both request validator', () => {
    expect(post['x-amazon-apigateway-request-validator']).toBe('Validate both')
  })

  it('has api_key security requirement', () => {
    const security = post['security'] as Record<string, unknown>[]
    expect(security).toBeDefined()
    expect(security.some((s) => 'api_key' in s)).toBe(true)
  })

  it('uses aws_proxy integration', () => {
    const integration = post['x-amazon-apigateway-integration'] as Record<string, string>
    expect(integration['type']).toBe('aws_proxy')
  })
})
