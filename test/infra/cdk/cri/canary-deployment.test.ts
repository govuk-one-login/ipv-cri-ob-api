import { testStack } from '../fixtures/test-stack'
import { criApi } from '@infra/cri/api/api'
import { criCanaryDeployment } from '@infra/cri/canary-deployment'
import { criFunction } from '@infra/cri/function'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { resolve } from 'node:path'
import { describe, it } from 'vitest'

const definition = resolve(import.meta.dirname, '../fixtures/openapi.yaml')

describe('criCanaryDeployment', () => {
  it('deploys gradually, rolling back on errors from the new version or 5XXs from its route', () => {
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
    criCanaryDeployment(stack, fn, { api, method: 'GET', path: '/example' })
    const template = Template.fromStack(stack)

    template.hasResourceProperties('AWS::Serverless::Function', {
      DeploymentPreference: {
        Alarms: {
          'Fn::If': [
            'UseCanaryDeploymentAlarms',
            [{ Ref: 'ExampleFunctionCanaryErrors' }, { Ref: 'ExampleFunctionCanary5xxErrors' }],
            [{ Ref: 'AWS::NoValue' }]
          ]
        },
        Enabled: true,
        Role: { 'Fn::GetAtt': ['CodeDeployServiceRole', 'Arn'] },
        Type: { Ref: 'LambdaDeploymentPreference' }
      }
    })
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Dimensions: Match.arrayWith([{ Name: 'ExecutedVersion', Value: Match.anyValue() }]),
      MetricName: 'Errors'
    })
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Dimensions: Match.arrayWith([{ Name: 'Resource', Value: '/example' }]),
      MetricName: '5XXError'
    })
  })
})
