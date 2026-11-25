import { testStack } from '../fixtures/test-stack'
import { criApi, criApiInvokePermission } from '@infra/cri/api/api'
import { criFunction } from '@infra/cri/function'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { resolve } from 'node:path'
import { describe, it } from 'vitest'

const definition = resolve(import.meta.dirname, '../fixtures/openapi.yaml')

describe('criApi', () => {
  it('makes a public API regional, with encrypted access logs and default throttling', () => {
    const stack = testStack()
    criApi(stack, 'ExampleApi', { definition, description: 'Example API', visibility: 'public' })
    const template = Template.fromStack(stack)

    template.hasResourceProperties('AWS::Serverless::Api', {
      AccessLogSetting: Match.objectLike({
        DestinationArn: { 'Fn::GetAtt': ['ExampleApiLogGroup', 'Arn'] }
      }),
      Auth: Match.absent(),
      EndpointConfiguration: { Type: 'REGIONAL' },
      MethodSettings: [
        Match.objectLike({
          DataTraceEnabled: { 'Fn::If': ['IsProduction', false, true] },
          HttpMethod: '*',
          ResourcePath: '/*',
          ThrottlingBurstLimit: 400,
          ThrottlingRateLimit: 200
        })
      ],
      Name: { 'Fn::Sub': '${AWS::StackName}-PublicTestAPI' }
    })
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      KmsKeyId: { 'Fn::GetAtt': ['LoggingKmsKey', 'Arn'] },
      LogGroupName: { 'Fn::Sub': '/aws/apigateway/${AWS::StackName}-public-AccessLogs' }
    })
    template.hasResourceProperties('AWS::KMS::Key', { EnableKeyRotation: true })
  })

  it('makes a private API private and VPC-endpoint only when deployed from the pipeline', () => {
    const stack = testStack()
    criApi(stack, 'ExampleApi', { definition, description: 'Example API', visibility: 'private' })

    Template.fromStack(stack).hasResourceProperties('AWS::Serverless::Api', {
      Auth: {
        ResourcePolicy: {
          CustomStatements: [
            Match.objectLike({ Effect: 'Allow' }),
            {
              'Fn::If': [
                'IsDeployedFromPipeline',
                Match.objectLike({ Condition: Match.anyValue(), Effect: 'Deny' }),
                { Ref: 'AWS::NoValue' }
              ]
            }
          ]
        }
      },
      EndpointConfiguration: {
        Type: { 'Fn::If': ['IsDeployedFromPipeline', 'PRIVATE', 'REGIONAL'] }
      }
    })
  })

  it('throttles a route that sets its own limits', () => {
    const stack = testStack()
    criApi(stack, 'ExampleApi', {
      definition,
      description: 'Example API',
      throttledRoutes: [
        { method: 'POST', path: '/example/route', throttle: { burstLimit: 10, rateLimit: 5 } }
      ],
      visibility: 'public'
    })

    Template.fromStack(stack).hasResourceProperties('AWS::Serverless::Api', {
      MethodSettings: [
        Match.objectLike({ ResourcePath: '/*' }),
        Match.objectLike({
          HttpMethod: 'POST',
          ResourcePath: '/~1example~1route',
          ThrottlingBurstLimit: 10,
          ThrottlingRateLimit: 5
        })
      ]
    })
  })
})

describe('criApiInvokePermission', () => {
  it("lets only the given API invoke the function's live alias", () => {
    const stack = testStack()
    const api = criApi(stack, 'ExampleApi', {
      definition,
      description: 'Example API',
      visibility: 'public'
    })
    const fn = criFunction(stack, 'ExampleFunction', {
      entry: 'src/example/handler/example-handler.ts',
      subnets: 'private'
    })
    criApiInvokePermission(stack, fn, api)

    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Permission', {
      FunctionName: { Ref: 'ExampleFunction.Alias' },
      SourceArn: {
        'Fn::Sub': [Match.stringLikeRegexp(':execute-api:'), { Api: { Ref: 'ExampleApi' } }]
      }
    })
  })
})
