import { testStack } from '../fixtures/test-stack'
import { criFunction } from '@infra/cri/function'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { describe, it } from 'vitest'

const entry = 'src/example/handler/example-handler.ts'

describe('criFunction', () => {
  it('names the function after its entry file and runs it with the programme defaults', () => {
    const stack = testStack()
    criFunction(stack, 'ExampleFunction', { entry, subnets: 'protected' })
    const template = Template.fromStack(stack)

    template.hasResourceProperties('AWS::Serverless::Function', {
      Architectures: ['arm64'],
      Environment: {
        Variables: Match.objectLike({
          AWS_LAMBDA_EXEC_WRAPPER: '/opt/dynatrace',
          ENVIRONMENT: { Ref: 'Environment' },
          POWERTOOLS_LOG_LEVEL: 'INFO',
          POWERTOOLS_METRICS_NAMESPACE: { Ref: 'CriIdentifier' }
        })
      },
      EventInvokeConfig: Match.absent(),
      Events: Match.absent(),
      FunctionName: { 'Fn::Sub': '${AWS::StackName}-example-handler' },
      Handler: 'example-handler.handler',
      ProvisionedConcurrencyConfig: Match.absent(),
      Runtime: 'nodejs24.x',
      Timeout: 40,
      Tracing: 'Active',
      VpcConfig: Match.objectLike({
        SubnetIds: ['A', 'B', 'C'].map((az) => ({
          'Fn::ImportValue': { 'Fn::Sub': `\${VpcStackName}-ProtectedSubnetId${az}` }
        }))
      })
    })
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: { 'Fn::Sub': '/aws/lambda/${AWS::StackName}-example-handler' }
    })
  })

  it('runs a scheduled function without retries', () => {
    const stack = testStack()
    criFunction(stack, 'ExampleFunction', {
      entry,
      schedule: 'rate(1 minute)',
      subnets: 'private'
    })

    Template.fromStack(stack).hasResourceProperties('AWS::Serverless::Function', {
      EventInvokeConfig: { MaximumRetryAttempts: 0 },
      Events: { Schedule: { Properties: { Schedule: 'rate(1 minute)' }, Type: 'Schedule' } }
    })
  })

  it('adds provisioned concurrency where the environment has some', () => {
    const stack = testStack()
    criFunction(stack, 'ExampleFunction', {
      entry,
      provisionedConcurrency: true,
      subnets: 'private'
    })

    Template.fromStack(stack).hasResourceProperties('AWS::Serverless::Function', {
      ProvisionedConcurrencyConfig: {
        'Fn::If': ['AddProvisionedConcurrency', Match.anyValue(), { Ref: 'AWS::NoValue' }]
      }
    })
  })
})
